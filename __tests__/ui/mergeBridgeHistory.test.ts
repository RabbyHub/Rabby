import { BridgeHistory } from '@rabby-wallet/rabby-api/dist/types';
import {
  collectOutgoingTxIds,
  collectViewportOutgoingTxIds,
  mergeHistoryWithBridge,
} from '@/ui/views/History/utils/mergeBridgeHistory';

const user = '0xuser';

const tx = (
  id: string,
  chain: string,
  from = user
): {
  _id: string;
  id: string;
  chain: string;
  tx: { from_addr: string };
} => ({
  _id: `${chain}-${id}`,
  id,
  chain,
  tx: { from_addr: from },
});

const bridge = (
  fromId: string,
  fromChain: string,
  toId?: string,
  toChain = 'base'
): BridgeHistory =>
  (({
    from_token: { chain: fromChain },
    to_token: { chain: toChain },
    to_actual_token: { chain: toChain },
    from_tx: { tx_id: fromId },
    to_tx: { tx_id: toId },
  } as unknown) as BridgeHistory);

describe('collectOutgoingTxIds', () => {
  it('fills a batch with outgoing txs and skips ones already queued', () => {
    const items = [
      tx('0x1', 'eth'),
      tx('0x2', 'eth', '0xother'),
      tx('0x3', 'arb'),
    ];
    const skip = new Set(['0x1']);
    expect(collectOutgoingTxIds(items, user, skip, 20)).toEqual(['0x3']);
    expect(skip.has('0x3')).toBe(true);
  });

  it('does not query scam transactions', () => {
    const items = [
      { ...tx('0xscam', 'eth'), is_scam: true },
      tx('0xok', 'eth'),
    ];
    expect(collectOutgoingTxIds(items, user, new Set(), 20)).toEqual(['0xok']);
  });

  it('fills the rest of a 20-id batch past the viewport', () => {
    const items = Array.from({ length: 25 }, (_, index) =>
      tx(`0x${index}`, 'eth')
    );
    const ids = collectViewportOutgoingTxIds(
      items,
      user,
      new Set(['0x0', '0x1']),
      0,
      2,
      5
    );
    expect(ids).toEqual(['0x2', '0x3', '0x4']);
  });
});

describe('mergeHistoryWithBridge', () => {
  it('replaces the from tx with one bridge card and drops the to tx', () => {
    const items = [
      tx('0xto', 'base', '0xbridge'),
      tx('0xfrom', 'eth'),
      tx('0xother', 'eth'),
    ];
    expect(
      mergeHistoryWithBridge(items, [bridge('0xfrom', 'eth', '0xto', 'base')])
    ).toEqual([
      {
        kind: 'bridge',
        key: 'bridge:eth:0xfrom',
        item: expect.objectContaining({
          from_tx: { tx_id: '0xfrom' },
        }),
      },
      { kind: 'tx', key: 'eth-0xother', item: items[2] },
    ]);
  });

  it('keeps the to tx until the from tx is in the list', () => {
    const items = [tx('0xto', 'base', '0xbridge')];
    expect(
      mergeHistoryWithBridge(items, [bridge('0xfrom', 'eth', '0xto', 'base')])
    ).toEqual([{ kind: 'tx', key: 'base-0xto', item: items[0] }]);
  });

  it('replaces a from tx before the destination tx is loaded', () => {
    const items = [tx('0xfrom', 'eth')];
    const rows = mergeHistoryWithBridge(items, [
      bridge('0xfrom', 'eth', '0xto', 'base'),
    ]);
    expect(rows).toEqual([
      {
        kind: 'bridge',
        key: 'bridge:eth:0xfrom',
        item: expect.anything(),
      },
    ]);
  });
});
