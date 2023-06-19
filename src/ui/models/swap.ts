import { createModel } from '@rematch/core';
import { RootModel } from '.';
import { ChainGas } from 'background/service/preference';
import { CHAINS_ENUM } from 'consts';
import { SwapServiceStore } from '@/background/service/swap';
import { DEX_ENUM } from '@rabby-wallet/rabby-swap';

export const swap = createModel<RootModel>()({
  name: 'swap',

  state: {
    selectedDex: null,
    selectedChain: CHAINS_ENUM.ETH,
    gasPriceCache: {},
    unlimitedAllowance: false,
    viewList: {},
    tradeList: {},
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

    async getSwapGasCache(chain: CHAINS_ENUM, store) {
      const gasCache = await store.app.wallet.getSwapGasCache(chain);
      this.setField({
        ...store.swap.gasPriceCache,
        [chain]: gasCache,
      });
      return gasCache;
    },

    async updateSwapGasCache(
      obj: { chain: CHAINS_ENUM; gas: ChainGas },
      store
    ) {
      await store.app.wallet.updateSwapGasCache(obj.chain, obj.gas);
      dispatch.swap.getSwapGasCache(obj.chain);
    },

    async setSwapDexId(selectedDex: DEX_ENUM, store) {
      await store.app.wallet.setSwapDexId(selectedDex);

      this.setField({
        selectedDex,
      });
    },

    async setSelectedChain(selectedChain: CHAINS_ENUM, store) {
      await store.app.wallet.setLastSelectedSwapChain(selectedChain);

      this.setField({
        selectedChain,
      });
    },
    async setUnlimitedAllowance(unlimitedAllowance: boolean, store) {
      await store.app.wallet.setUnlimitedAllowance(unlimitedAllowance);

      this.setField({
        unlimitedAllowance,
      });
    },

    async getSwapViewList(_?, store?) {
      const viewList = await store.app.wallet.getSwapViewList();
      this.setField({
        viewList,
      });
    },

    async getSwapTradeList(_?, store?) {
      const tradeList = await store.app.wallet.getSwapTradeList();
      this.setField({
        tradeList,
      });
    },

    async setSwapView(
      unlimitedAllowance: Parameters<typeof store.app.wallet.setSwapView>,
      store
    ) {
      await store.app.wallet.setSwapView(
        unlimitedAllowance[0],
        unlimitedAllowance[1]
      );
      this.getSwapViewList();
    },

    async setSwapTrade(
      unlimitedAllowance: Parameters<typeof store.app.wallet.setSwapTrade>,
      store
    ) {
      await store.app.wallet.setSwapTrade(
        unlimitedAllowance[0],
        unlimitedAllowance[1]
      );
      this.getSwapTradeList();
    },
  }),
});
