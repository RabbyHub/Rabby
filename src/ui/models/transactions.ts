import { createModel } from '@rematch/core';

import { RootModel } from '.';

type IState = {
  pendingTransactionCount: number;
};

export const transactions = createModel<RootModel>()({
  name: 'transactions',
  state: <IState>{
    pendingTransactionCount: 0,
  },
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
    async getPendingTxCountAsync(address: string, store) {
      const count = await store.app.wallet.getPendingCount<number>(address);
      dispatch.transactions.setField({ pendingTransactionCount: count });
      return count;
    },
  }),
});
