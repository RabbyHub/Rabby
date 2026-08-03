import { CHAINS_ENUM } from '@debank/common';
import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import { DEX_ENUM } from '@rabby-wallet/rabby-swap';

import { ChainGas } from '@/background/service/preference';
import { SwapServiceStore } from '@/background/service/swap';
import { DEX } from '@/constant';
import { findChain } from '@/utils/chain';
import type { WalletControllerType } from '@/ui/utils/WalletContext';
import { wallet } from '@/ui/wallet';
import { createBaseStore } from './createBaseStore';
import { createExtensionStoreOptions } from './createExtensionStoreOptions';

type SwapState = SwapServiceStore & {
  $$initialSelectedChain: CHAINS_ENUM | null;
  supportedDEXList: string[];
};

type SwapActions = {
  getSwapGasCache: (chain: CHAINS_ENUM) => Promise<ChainGas | null>;
  updateSwapGasCache: (chain: CHAINS_ENUM, gas: ChainGas) => void;
  setSwapDexId: (selectedDex: DEX_ENUM) => void;
  setSelectedChain: (selectedChain: CHAINS_ENUM) => void;
  setSelectedFromToken: (token?: TokenItem) => void;
  setSelectedToToken: (token?: TokenItem) => void;
  setUnlimitedAllowance: (value: boolean) => void;
  getSwapViewList: () => Promise<SwapServiceStore['viewList']>;
  getSwapTradeList: () => Promise<SwapServiceStore['tradeList']>;
  setSwapView: (
    ...args: Parameters<WalletControllerType['setSwapView']>
  ) => void;
  setSwapTrade: (
    ...args: Parameters<WalletControllerType['setSwapTrade']>
  ) => void;
  getSwapSortIncludeGasFee: () => Promise<void>;
  setSwapSortIncludeGasFee: (value: boolean) => void;
  getSwapPreferMEV: () => Promise<void>;
  setSwapPreferMEV: (value: boolean) => void;
  getSwapSupportedDEXList: () => Promise<void>;
  setAutoSlippage: (value: boolean) => void;
  setIsCustomSlippage: (value: boolean) => void;
  setSlippage: (value: string) => void;
  setRecentSwapToToken: (token: TokenItem) => void;
  checkStore: () => void;
};

export type SwapStore = SwapState & SwapActions;

export const useSwapStore = createBaseStore<SwapStore>(
  (set, get) => ({
    slippage: '0.1',
    autoSlippage: true,
    supportedDEXList: Object.keys(DEX),
    selectedDex: null,
    selectedChain: null,
    gasPriceCache: {},
    unlimitedAllowance: false,
    viewList: {} as SwapServiceStore['viewList'],
    tradeList: {} as SwapServiceStore['tradeList'],
    sortIncludeGasFee: false,
    preferMEVGuarded: false,
    $$initialSelectedChain: null,
    recentToTokens: [],

    async getSwapGasCache(chain) {
      const gas = await wallet.getSwapGasCache(chain);
      if (gas) {
        useSwapStore.persist.applyRemote({
          gasPriceCache: { ...get().gasPriceCache, [chain]: gas },
        });
      }
      return gas;
    },
    updateSwapGasCache(chain, gas) {
      set((state) => ({
        gasPriceCache: { ...state.gasPriceCache, [chain]: gas },
      }));
    },
    setSwapDexId(selectedDex) {
      set({ selectedDex });
    },
    setSelectedChain(selectedChain) {
      set({ selectedChain });
    },
    setSelectedFromToken(selectedFromToken) {
      set({ selectedFromToken });
    },
    setSelectedToToken(selectedToToken) {
      set({ selectedToToken });
    },
    setUnlimitedAllowance(unlimitedAllowance) {
      set({ unlimitedAllowance });
    },
    async getSwapViewList() {
      const viewList = await wallet.getSwapViewList();
      useSwapStore.persist.applyRemote({ viewList });
      return viewList;
    },
    async getSwapTradeList() {
      const tradeList = await wallet.getSwapTradeList();
      useSwapStore.persist.applyRemote({ tradeList });
      return tradeList;
    },
    setSwapView(id, value) {
      set((state) => ({
        viewList: {
          ...state.viewList,
          [id]: value,
        } as SwapServiceStore['viewList'],
      }));
    },
    setSwapTrade(id, value) {
      set((state) => ({
        tradeList: {
          ...state.tradeList,
          [id]: value,
        } as SwapServiceStore['tradeList'],
      }));
    },
    async getSwapSortIncludeGasFee() {
      const sortIncludeGasFee = await wallet.getSwapSortIncludeGasFee();
      useSwapStore.persist.applyRemote({ sortIncludeGasFee });
    },
    setSwapSortIncludeGasFee(sortIncludeGasFee) {
      set({ sortIncludeGasFee });
    },
    async getSwapPreferMEV() {
      const preferMEVGuarded = await wallet.getSwapPreferMEVGuarded();
      useSwapStore.persist.applyRemote({ preferMEVGuarded });
    },
    setSwapPreferMEV(preferMEVGuarded) {
      set({ preferMEVGuarded });
    },
    async getSwapSupportedDEXList() {
      const data = await wallet.openapi.getSupportedDEXList();
      if (data.dex_list) {
        useSwapStore.persist.applyRemote({
          supportedDEXList: data.dex_list.filter((item) =>
            Object.prototype.hasOwnProperty.call(DEX, item)
          ),
        });
      }
    },
    setAutoSlippage(autoSlippage) {
      set({ autoSlippage });
    },
    setIsCustomSlippage(isCustomSlippage) {
      set({ isCustomSlippage });
    },
    setSlippage(slippage) {
      set({ slippage });
    },
    setRecentSwapToToken(token) {
      set({
        recentToTokens: [
          token,
          ...(get().recentToTokens || []).filter(
            (item) => item.id !== token.id || item.chain !== token.chain
          ),
        ].slice(0, 5),
      });
    },
    checkStore() {
      const selectedChain = get().selectedChain;
      if (selectedChain && !findChain({ enum: selectedChain })) {
        get().setSelectedChain(CHAINS_ENUM.ETH);
      }
    },
  }),
  createExtensionStoreOptions<SwapStore, 'swap'>({
    autoHydrate: false,
    storageKey: 'swap',
    partialize(state) {
      const persistedState: Partial<SwapStore> = {};
      Object.entries(state).forEach(([key, value]) => {
        if (
          key !== '$$initialSelectedChain' &&
          key !== 'supportedDEXList' &&
          typeof value !== 'function'
        ) {
          (persistedState as Record<string, unknown>)[key] = value;
        }
      });
      return persistedState;
    },
    merge(persistedState, currentState) {
      return {
        ...currentState,
        ...persistedState,
        $$initialSelectedChain: persistedState.selectedChain || null,
      };
    },
    onError(error) {
      console.error('[swapStore]', error);
    },
  })
);

export const initializeSwapStore = async () => {
  await useSwapStore.persist.hydrate();
  void useSwapStore.getState().getSwapSupportedDEXList();
};
