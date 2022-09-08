import { createModel } from '@rematch/core';
import { RootModel } from '.';
import { SignTextHistoryItem } from 'background/service/signTextHistory';

interface SignTextHistoryState {
  history: {
    [key: string]: Record<string, SignTextHistoryItem[]>;
  };
}

export const signTxHistory = createModel<RootModel>()({
  name: 'signTxHistory',

  state: {
    history: {},
  } as SignTextHistoryState,

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
