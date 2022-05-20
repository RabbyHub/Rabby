import { createModel } from '@rematch/core';
import { RootModel } from '.';

interface OpenAPIState {
  host: string;
}

export const openapi = createModel<RootModel>()({
  name: 'openapi',

  state: {
    host: '',
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
    async getHost(_?, store?) {
      // TODO
    },
    async setHost() {
      // TODO
    },
  }),
});
