import { createModel } from '@rematch/core';
import { RootModel } from '.';
import { GasCache } from 'background/service/preference';
import { CHAINS_ENUM } from 'consts';
import { SwapServiceStore } from '@/background/service/swap';
import { DEX_ENUM } from '@rabby-wallet/rabby-swap';

export const swap = createModel<RootModel>()({
  name: 'swap',

  state: {
    selectedDex: null,
    selectedChain: CHAINS_ENUM.ETH,
  } as Partial<SwapServiceStore>,

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
    init() {
      return this.syncState();
    },
    async syncState(key?: keyof SwapServiceStore, store?) {
      const data = await store.app.wallet.getSwap(key);

      this.setField(
        key
          ? {
              [key]: data,
            }
          : {
              ...(data as SwapServiceStore),
            }
      );
    },

    async updateSwapGasCache(
      obj: { chain: CHAINS_ENUM; gas: GasCache },
      store
    ) {
      await store.app.wallet.updateSwapGasCache(obj.chain, obj.gas);
      dispatch.swap.syncState();
    },

    async setSwapDexId(selectedDex: DEX_ENUM, store) {
      await store.app.wallet.setSwapDexId(selectedDex);

      this.setField({
        selectedDex,
      });
    },

    async setSelectedChain(selectedChain: CHAINS_ENUM, store) {
      await store.app.wallet.setLas(selectedChain);

      this.setField({
        selectedChain,
      });
    },
  }),
});
