import { CHAINS_ENUM } from '@debank/common';
import { RPCItem } from '@/background/service/rpc';
import { createModel } from '@rematch/core';

import { RootModel } from '.';

type IState = {
  customRPC: Record<CHAINS_ENUM, RPCItem>;
};

export const customRPC = createModel<RootModel>()({
  name: 'customRPC',
  state: {
    customRPC: {},
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
    async getAllRPC(_: void, store) {
      const rpcMap = await store.app.wallet.getAllCustomRPC();
      dispatch.customRPC.setField({ customRPC: rpcMap });
      return rpcMap;
    },

    async setCustomRPC(
      payload: {
        chain: CHAINS_ENUM;
        url: string;
      },
      store
    ) {
      await store.app.wallet.setCustomRPC(payload.chain, payload.url);
      dispatch.customRPC.getAllRPC();
    },

    async setRPCEnable(
      payload: { chain: CHAINS_ENUM; enable: boolean },
      store
    ) {
      await store.app.wallet.setRPCEnable(payload.chain, payload.enable);
      dispatch.customRPC.getAllRPC();
    },

    async deleteCustomRPC(chain: CHAINS_ENUM, store) {
      await store.app.wallet.removeCustomRPC(chain);
      dispatch.customRPC.getAllRPC();
    },
  }),
});
