import { createModel } from '@rematch/core';
import { RootModel } from '.';

interface OpenAPIState {
  host: string;
  testnetHost: string;
}

export const openapi = createModel<RootModel>()({
  name: 'openapi',

  state: {
    host: '',
    testnetHost: '',
  } as OpenAPIState,

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
    async getHost(_: void, store) {
      const host = await store.app.wallet.openapi.getHost();
      this.setField({ host });
    },
    async setHost(host: string, store) {
      await store.app.wallet.openapi.setHost(host);
      this.getHost();
    },
    async getTestnetHost(_: void, store) {
      const testnetHost = await store.app.wallet.testnetOpenapi.getHost();
      this.setField({ testnetHost });
    },
    async setTestnetHost(host: string, store) {
      await store.app.wallet.openapi.setTestnetHost(host);
      await store.app.wallet.testnetOpenapi.setHost(host);
      this.setField({ testnetHost: host });
      this.getHost();
    },
  }),
});
