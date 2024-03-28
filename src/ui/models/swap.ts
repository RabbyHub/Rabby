import { createModel } from '@rematch/core';
import { RootModel } from '.';
import { ChainGas } from 'background/service/preference';
import { CHAINS_ENUM } from 'consts';
import { SwapServiceStore } from '@/background/service/swap';
import { DEX_ENUM } from '@rabby-wallet/rabby-swap';
import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';

export const swap = createModel<RootModel>()({
  name: 'swap',

  state: {
    selectedDex: null,
    selectedChain: null,
    gasPriceCache: {},
    unlimitedAllowance: false,
    viewList: {},
    tradeList: {},
    sortIncludeGasFee: false,
    preferMEVGuarded: false,
    $$initialSelectedChain: null,
  } as Partial<SwapServiceStore> & {
    $$initialSelectedChain: CHAINS_ENUM | null;
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
    init() {
      return this.syncState();
    },
    async syncState(key: keyof SwapServiceStore | undefined, store) {
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

      if (!key) {
        this.setField({
          $$initialSelectedChain:
            (data as SwapServiceStore).selectedChain || null,
        });
      }
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

    async setSelectedFromToken(
      selectedFromToken: TokenItem | undefined,
      store
    ) {
      await store.app.wallet.setSelectedFromToken(selectedFromToken);

      this.setField({
        selectedFromToken,
      });
    },

    async setSelectedToToken(selectedToToken: TokenItem | undefined, store) {
      await store.app.wallet.setSelectedToToken(selectedToToken);

      this.setField({
        selectedToToken,
      });
    },

    async setUnlimitedAllowance(unlimitedAllowance: boolean, store) {
      await store.app.wallet.setUnlimitedAllowance(unlimitedAllowance);

      this.setField({
        unlimitedAllowance,
      });
    },

    async getSwapViewList(_: void, store) {
      const viewList = await store.app.wallet.getSwapViewList();
      this.setField({
        viewList,
      });
      return viewList;
    },

    async getSwapTradeList(_: void, store) {
      const tradeList = await store.app.wallet.getSwapTradeList();
      this.setField({
        tradeList,
      });
      return tradeList;
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
    async getSwapSortIncludeGasFee(_: void, store) {
      const sortIncludeGasFee = await store.app.wallet.getSwapSortIncludeGasFee();
      this.setField({
        sortIncludeGasFee,
      });
    },

    async setSwapSortIncludeGasFee(bool: boolean, store) {
      await store.app.wallet.setSwapSortIncludeGasFee(bool);
      this.getSwapSortIncludeGasFee();
    },

    async getSwapPreferMEV(_: void, store) {
      const preferMEVGuarded = await store.app.wallet.getSwapPreferMEVGuarded();
      this.setField({
        preferMEVGuarded,
      });
    },

    async setSwapPreferMEV(bool: boolean, store) {
      await store.app.wallet.setSwapPreferMEVGuarded(bool);
      this.getSwapPreferMEV();
    },
  }),
});
