import type { WalletControllerType } from '@/ui/utils/WalletContext';
import {
  enqueueBridgeLookups,
  getBridgeLookupSession,
  subscribeBridgeLookup,
} from '@/ui/views/History/utils/bridgeHistoryLookup';

jest.mock('@/constant', () => ({
  INTERNAL_REQUEST_ORIGIN: 'chrome-extension://rabby',
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
