import {
  getDefaultTransactionsState,
  useTransactionsStore,
} from '@/ui/state/transactions';
import { wallet } from '@/ui/wallet';

jest.mock('@/ui/wallet', () => ({
  wallet: {
    getPendingCount: jest.fn(),
  },
}));

describe('transactions store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useTransactionsStore.setState(getDefaultTransactionsState());
  });

  test('keeps the address-specific pending count in a non-persisted store', () => {
    expect(useTransactionsStore.getState().pendingTransactionCount).toBe(0);
    expect('persist' in useTransactionsStore).toBe(false);
  });

  test('loads, stores, and returns the pending transaction count', async () => {
    (wallet.getPendingCount as jest.Mock).mockResolvedValue(3);

    await expect(
      useTransactionsStore
        .getState()
        .getPendingTxCountAsync('0x0000000000000000000000000000000000000001')
    ).resolves.toBe(3);

    expect(wallet.getPendingCount).toHaveBeenCalledWith(
      '0x0000000000000000000000000000000000000001'
    );
    expect(useTransactionsStore.getState().pendingTransactionCount).toBe(3);
  });
});
