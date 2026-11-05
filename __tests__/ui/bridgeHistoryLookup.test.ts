import type { WalletControllerType } from '@/ui/utils/WalletContext';
import type { BridgeHistory } from '@rabby-wallet/rabby-api/dist/types';
import { refreshBridgeHistoryTop10 } from '@/ui/views/Bridge/utils/historyCache';
import { mergeHistoryWithBridge } from '@/ui/views/History/utils/mergeBridgeHistory';
import {
  enqueueBridgeLookups,
  getBridgeLookupSession,
  getBridgeLookupSnapshot,
  subscribeBridgeLookup,
} from '@/ui/views/History/utils/bridgeHistoryLookup';

jest.mock('@/constant', () => ({
  INTERNAL_REQUEST_ORIGIN: 'chrome-extension://rabby',
}));

jest.mock('@/ui/utils', () => ({
  isSameAddress: (a: string, b: string) =>
    !!a && !!b && a.toLowerCase() === b.toLowerCase(),
}));

const createWallet = () => {
  const query = jest.fn().mockResolvedValue({ history_list: [] });
  const wallet = ({
    getTransactionHistory: jest.fn().mockResolvedValue({
      pendings: [],
      completeds: [],
    }),
    openapi: { getBridgeHistoryListByTxIds: query },
  } as unknown) as WalletControllerType;
  return { wallet, query };
};

describe('bridge lookup session', () => {
  it('merges a preloaded Bridge before subscribing and skips duplicate lookups', async () => {
    const address = '0xpreloaded';
    const { wallet, query } = createWallet();
    const item = ({
      from_token: { chain: 'eth' },
      from_tx: { tx_id: '0xABC' },
      status: 'pending',
    } as unknown) as BridgeHistory;
    wallet.openapi.getBridgeHistoryList = jest
      .fn()
      .mockResolvedValue({ history_list: [item] });
    await refreshBridgeHistoryTop10(wallet, address);

    const session = getBridgeLookupSession(address);
    const snapshot = getBridgeLookupSnapshot(session);
    expect(
      mergeHistoryWithBridge(
        [{ chain: 'eth', id: '0xabc', _id: 'source' }],
        snapshot
      )
    ).toMatchObject([{ kind: 'bridge', item }]);
    expect(getBridgeLookupSnapshot(session)).toBe(snapshot);

    const unsubscribe = subscribeBridgeLookup(session, () => {});
    try {
      enqueueBridgeLookups(session, wallet, address, ['0xabc']);
      await session.queue.onIdle();
      expect(query).not.toHaveBeenCalled();

      const completed = { ...item, status: 'completed' };
      query.mockResolvedValueOnce({ history_list: [completed] });
      enqueueBridgeLookups(session, wallet, address, ['0xabc'], true);
      await session.queue.onIdle();
      expect(getBridgeLookupSnapshot(session)).toEqual([completed]);
      expect(getBridgeLookupSnapshot(getBridgeLookupSession(address))).toEqual([
        completed,
      ]);
    } finally {
      unsubscribe();
    }
  });

  it('reads shared refreshes on re-entry without notifying the open page', async () => {
    const address = '0xsubscribed-cache';
    const { wallet } = createWallet();
    const item = ({
      from_token: { chain: 'eth' },
      from_tx: { tx_id: '0x5' },
      status: 'pending',
    } as unknown) as BridgeHistory;
    wallet.openapi.getBridgeHistoryList = jest
      .fn()
      .mockResolvedValue({ history_list: [item] });
    await refreshBridgeHistoryTop10(wallet, address);
    const session = getBridgeLookupSession(address);
    const notify = jest.fn();
    const unsubscribe = subscribeBridgeLookup(session, notify);
    expect(getBridgeLookupSnapshot(session)).toEqual([item]);
    (wallet.openapi.getBridgeHistoryList as jest.Mock).mockResolvedValue({
      history_list: [{ ...item, status: 'completed' }],
    });
    await refreshBridgeHistoryTop10(wallet, address);
    expect(notify).not.toHaveBeenCalled();
    expect(getBridgeLookupSnapshot(session)).toEqual([item]);
    unsubscribe();
    expect(getBridgeLookupSession(address)).toBe(session);
    expect(getBridgeLookupSnapshot(session)[0].status).toBe('completed');
  });

  it('deduplicates in-flight ids and preserves empty results across remounts', async () => {
    const address = '0xempty-cache';
    const session = getBridgeLookupSession(address);
    const { wallet, query } = createWallet();
    let unsubscribe = subscribeBridgeLookup(session, () => {});
    try {
      enqueueBridgeLookups(session, wallet, address, ['0xABC']);
      enqueueBridgeLookups(session, wallet, address, ['0xabc']);
      await session.queue.onIdle();
      expect(query).toHaveBeenCalledTimes(1);

      unsubscribe();
      const reopened = getBridgeLookupSession(address.toUpperCase());
      expect(reopened).toBe(session);
      unsubscribe = subscribeBridgeLookup(reopened, () => {});
      enqueueBridgeLookups(reopened, wallet, address, ['0xabc']);
      await session.queue.onIdle();
      expect(query).toHaveBeenCalledTimes(1);
    } finally {
      unsubscribe();
    }
  });

  it('allows polling to refresh a cached lookup', async () => {
    const address = '0xpoll-cache';
    const session = getBridgeLookupSession(address);
    const { wallet, query } = createWallet();
    const unsubscribe = subscribeBridgeLookup(session, () => {});
    try {
      enqueueBridgeLookups(session, wallet, address, ['0xabc']);
      await session.queue.onIdle();
      enqueueBridgeLookups(session, wallet, address, ['0xabc'], true);
      await session.queue.onIdle();
      expect(query).toHaveBeenCalledTimes(2);
      expect(wallet.getTransactionHistory).toHaveBeenCalledTimes(1);
    } finally {
      unsubscribe();
    }
  });
});
