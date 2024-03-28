import { createModel } from '@rematch/core';

import { RootModel } from '.';

type IState = {
  enabled: boolean;
  whitelist: string[];
};

export const whitelist = createModel<RootModel>()({
  name: 'whitelist',
  state: {
    enabled: false,
    whitelist: [],
  } as IState,
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
    async init() {
      this.getWhitelist();
      this.getWhitelistEnabled();
    },
    async getWhitelist(_: void, store) {
      const whitelist = await store.app.wallet.getWhitelist();
      dispatch.whitelist.setField({ whitelist });
    },
    async getWhitelistEnabled(_: void, store) {
      const enabled = await store.app.wallet.isWhitelistEnabled();
      dispatch.whitelist.setField({ enabled });
    },
  }),
});
