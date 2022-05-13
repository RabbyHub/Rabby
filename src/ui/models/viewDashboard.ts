import { createModel } from '@rematch/core';
import { RootModel } from '.';

export const viewDashboard = createModel<RootModel>()({
  name: 'viewDashboard',
  state: {
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
    async getPendingTxCountAsync(address: string, state) {
      const count = await state.app.wallet.getPendingCount<number>(address);
      dispatch.viewDashboard.setField({ pendingTransactionCount: count });
    },
  }),
});
