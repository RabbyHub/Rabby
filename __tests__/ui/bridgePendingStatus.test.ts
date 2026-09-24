import type { BridgeHistory } from '@rabby-wallet/rabby-api/dist/types';
import type { BridgeTxHistoryItem } from '@/background/service/transactionHistory';
import { ONE_DAY_MS, ONE_HOUR_MS } from '@/ui/views/Bridge/constants';
import {
  isBridgePendingExpired,
  resolveBridgePendingFromHistoryList,
} from '@/ui/views/Bridge/utils/pendingStatus';

const now = 1_700_000_000_000;

const localItem = (
  overrides: Partial<BridgeTxHistoryItem> = {}
): BridgeTxHistoryItem =>
  (({
    hash: '0xlocal',
    fromChainId: 1,
    createdAt: now - 60_000,
    status: 'pending',
    ...overrides,
  } as unknown) as BridgeTxHistoryItem);

const historyItem = (
  overrides: Partial<BridgeHistory> & { txId?: string; status?: string } = {}
): BridgeHistory =>
  (({
    from_tx: { tx_id: overrides.txId || '0xlocal' },
    status: overrides.status || 'pending',
    to_actual_token: { id: 'usdc' },
    actual: { receive_token_amount: 12.5 },
    ...overrides,
  } as unknown) as BridgeHistory);

describe('isBridgePendingExpired', () => {
  it('matches the original one-day cutoff', () => {
    expect(isBridgePendingExpired(now - ONE_DAY_MS - 1, now)).toBe(true);
    expect(isBridgePendingExpired(now - ONE_DAY_MS + 1, now)).toBe(false);
    expect(isBridgePendingExpired(undefined, now)).toBe(false);
  });
});

describe('resolveBridgePendingFromHistoryList', () => {
  it('keeps when the list is missing, same as not entering the findTx branch', () => {
    expect(
      resolveBridgePendingFromHistoryList(
        localItem({ createdAt: now - ONE_HOUR_MS - 1 }),
        undefined,
        now
      )
    ).toEqual({ kind: 'keep' });
  });

  it('times out an empty list after one hour, same as BRIDGE_HISTORY_UPDATED', () => {
    const local = localItem({ createdAt: now - ONE_HOUR_MS - 1 });
    expect(resolveBridgePendingFromHistoryList(local, [], now)).toEqual({
      kind: 'hide-failed',
      hash: '0xlocal',
      fromChainId: 1,
    });
  });

  it('keeps an empty list within one hour', () => {
    expect(resolveBridgePendingFromHistoryList(localItem(), [], now)).toEqual({
      kind: 'keep',
    });
  });

  it('hides a missing item after one hour and completes with the original hash', () => {
    const local = localItem({ createdAt: now - ONE_HOUR_MS - 1 });
    expect(
      resolveBridgePendingFromHistoryList(
        local,
        [historyItem({ txId: '0xother' })],
        now
      )
    ).toEqual({
      kind: 'hide-failed',
      hash: '0xlocal',
      fromChainId: 1,
    });
  });

  it('matches accelerated hash like fetchHistory and returns the original hash for store writes', () => {
    const local = localItem({
      hash: '0xlocal',
      acceleratedHash: '0xaccel',
    });
    const item = historyItem({
      txId: '0xaccel',
      status: 'completed',
    });

    expect(
      resolveBridgePendingFromHistoryList(local, [item], now)
    ).toMatchObject({
      kind: 'complete',
      hash: '0xlocal',
      fromChainId: 1,
      status: 'allSuccess',
      item,
      local: {
        hash: '0xlocal',
        status: 'allSuccess',
        actualToToken: { id: 'usdc' },
        actualToAmount: 12.5,
        completedAt: now,
      },
    });
  });

  it('returns pending when the server item is still pending, same as the old else setData branch', () => {
    expect(
      resolveBridgePendingFromHistoryList(
        localItem(),
        [historyItem({ status: 'pending' })],
        now
      )
    ).toEqual({ kind: 'pending' });
  });

  it('syncs fromSuccess from remote from_tx while the bridge is still pending', () => {
    const item = historyItem({
      status: 'pending',
      from_tx: {
        tx_id: '0xlocal',
        chain_id: 'eth',
        status: 'success',
        time_at: Math.floor((now - 5_000) / 1000),
      },
    });
    expect(
      resolveBridgePendingFromHistoryList(localItem(), [item], now)
    ).toMatchObject({
      kind: 'sync',
      local: {
        status: 'fromSuccess',
        fromTxCompleteTs: now - 5_000,
      },
    });
  });

  it('marks a failed server item as fromFailed when from_tx failed', () => {
    const item = historyItem({
      status: 'failed',
      from_tx: {
        tx_id: '0xlocal',
        chain_id: 'eth',
        status: 'failed',
        time_at: Math.floor(now / 1000),
      },
      to_tx: { tx_id: '0xdest' },
    });
    expect(
      resolveBridgePendingFromHistoryList(localItem(), [item], now)
    ).toMatchObject({
      kind: 'complete',
      status: 'fromFailed',
      local: { status: 'fromFailed' },
    });
  });

  it('marks a failed server item as failed and keeps the destination tx id', () => {
    const item = historyItem({
      status: 'failed',
      from_tx: {
        tx_id: '0xlocal',
        chain_id: 'eth',
        status: 'success',
        time_at: Math.floor(now / 1000),
      },
      to_tx: { tx_id: '0xdest' },
    });
    expect(
      resolveBridgePendingFromHistoryList(localItem(), [item], now)
    ).toMatchObject({
      kind: 'complete',
      status: 'failed',
      hash: '0xlocal',
      item,
      local: {
        toTxId: '0xdest',
      },
    });
  });
});
