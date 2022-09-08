import { createModel } from '@rematch/core';
import { RootModel } from '.';
import { TransactionGroup } from 'background/service/transactionHistory';

interface TransactionHistoryState {
  transactions: {
    [key: string]: Record<string, TransactionGroup>;
  };
}

export const signTxHistory = createModel<RootModel>()({
  name: 'signTxHistory',

  state: {
    transactions: {},
  } as TransactionHistoryState,

  reducers: {
    setField(state, payload: Partial<typeof state>) {
      return Object.keys(payload).reduce(
        (accu, key) => {
          accu[key] = payload[key];
          return accu;
        },
        { ...state }
      );
    },
  },

  effects: (dispatch) => ({
    async getTransactions() {
      // TODO
    },
  }),
});
