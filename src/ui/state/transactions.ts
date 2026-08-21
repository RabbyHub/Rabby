import { create } from 'zustand';

import { wallet } from '@/ui/wallet';

export type TransactionsState = {
  pendingTransactionCount: number;
};

type TransactionsActions = {
  getPendingTxCountAsync: (address: string) => Promise<number>;
};

export type TransactionsStore = TransactionsState & TransactionsActions;

export const getDefaultTransactionsState = (): TransactionsState => ({
  pendingTransactionCount: 0,
});

export const useTransactionsStore = create<TransactionsStore>()((set) => ({
  ...getDefaultTransactionsState(),

  async getPendingTxCountAsync(address) {
    const pendingTransactionCount = await wallet.getPendingCount<number>(
      address
    );
    set({ pendingTransactionCount });
    return pendingTransactionCount;
  },
}));
