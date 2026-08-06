import { CHAINS_ENUM } from '@debank/common';
import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';

import { SwapServiceStore } from '@/background/service/swap';
import { DEX } from '@/constant';
import { findChain } from '@/utils/chain';
import { wallet } from '@/ui/wallet';
import { createExtensionStoreOptions } from './createExtensionStoreOptions';
import { createRabbyStore } from './createRabbyStore';

const isTokenOnChain = (token: TokenItem | undefined, chain: CHAINS_ENUM) => {
  const chainInfo = findChain({ enum: chain });

  return !!token && !!chainInfo && token.chain === chainInfo.serverId;
};

type SwapState = SwapServiceStore & {
  $$initialSelectedChain: CHAINS_ENUM | null;
  supportedDEXList: string[];
};

type SwapActions = {
  setSelectedChain: (selectedChain: CHAINS_ENUM) => void;
  setSelectedFromToken: (token?: TokenItem) => void;
  setSelectedToToken: (token?: TokenItem) => void;
  setSwapPreferMEV: (value: boolean) => void;
  getSwapSupportedDEXList: () => Promise<void>;
  setAutoSlippage: (value: boolean) => void;
  setIsCustomSlippage: (value: boolean) => void;
  setSlippage: (value: string) => void;
  setRecentSwapToToken: (token: TokenItem) => void;
  checkStore: () => void;
};

export type SwapStore = SwapState & SwapActions;

export const useSwapStore = createRabbyStore<SwapStore>(
  (set, get) => ({
    slippage: '0.1',
    autoSlippage: true,
    supportedDEXList: Object.keys(DEX),
    selectedChain: null,
    preferMEVGuarded: false,
    $$initialSelectedChain: null,
    recentToTokens: [],

    setSelectedChain(selectedChain) {
      set((state) => ({
        selectedChain,
        selectedFromToken: isTokenOnChain(
          state.selectedFromToken,
          selectedChain
        )
          ? state.selectedFromToken
          : undefined,
        selectedToToken: isTokenOnChain(state.selectedToToken, selectedChain)
          ? state.selectedToToken
          : undefined,
      }));
    },
    setSelectedFromToken(selectedFromToken) {
      set({ selectedFromToken });
    },
    setSelectedToToken(selectedToToken) {
      set({ selectedToToken });
    },
    setSwapPreferMEV(preferMEVGuarded) {
      set({ preferMEVGuarded });
    },
    async getSwapSupportedDEXList() {
      const data = await wallet.openapi.getSupportedDEXList();
      if (data.dex_list) {
        set({
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
