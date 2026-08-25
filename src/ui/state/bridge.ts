import { ALL_SUPPORTED_BRIDGE_CHAINS } from '@rabby-wallet/rabby-bridge';
import type { TokenItem } from '@rabby-wallet/rabby-api/dist/types';

import type { BridgeServiceStore } from '@/background/service/bridge';
import type { BridgeAggregator } from '@/background/service/openapi';
import { DEFAULT_BRIDGE_AGGREGATOR } from '@/constant/bridge';
import { wallet } from '@/ui/wallet';
import { CHAINS, CHAINS_ENUM } from 'consts';
import { ensureChainListValid, findChainByServerID } from '@/utils/chain';
import { createExtensionStoreOptions } from './createStore/createExtensionStoreOptions';
import { createRabbyStore } from './createStore/createRabbyStore';

export type BridgeState = BridgeServiceStore & {
  $$initialSelectedChain: CHAINS_ENUM | null;
  aggregatorsList: BridgeAggregator[];
  aggregatorsListInit: boolean;
  selectedDex: string | null;
  supportedChains: CHAINS_ENUM[];
};

export type BridgeActions = {
  init: () => Promise<void>;
  setSelectedAggregators: (selectedAggregators: string[]) => void;
  setSelectedChain: (selectedChain: CHAINS_ENUM) => void;
  setSelectedFromToken: (selectedFromToken?: TokenItem) => void;
  setSelectedToToken: (selectedToToken?: TokenItem) => void;
  fetchAggregatorsList: () => Promise<void>;
  fetchSupportedChains: () => Promise<void>;
};

export type BridgeStore = BridgeState & BridgeActions;

export const getDefaultBridgeState = (): BridgeState => ({
  selectedChain: null,
  selectedFromToken: undefined,
  selectedToToken: undefined,
  selectedAggregators: [],
  txQuotes: {},
  unlimitedAllowance: false,
  sortIncludeGasFee: true,
  firstOpen: true,
  supportedChains: ensureChainListValid(
    ALL_SUPPORTED_BRIDGE_CHAINS as string[]
  ) as CHAINS_ENUM[],
  aggregatorsListInit: false,
  aggregatorsList: DEFAULT_BRIDGE_AGGREGATOR,
  selectedDex: null,
  $$initialSelectedChain: null,
});

export const useBridgeStore = createRabbyStore<BridgeStore>(
  (set, get) => ({
    ...getDefaultBridgeState(),

    async init() {
      await useBridgeStore.persist.hydrate();
      await Promise.allSettled([
        get().fetchAggregatorsList(),
        get().fetchSupportedChains(),
      ]);
    },
    setSelectedAggregators(selectedAggregators) {
      set({ selectedAggregators });
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
    async fetchAggregatorsList() {
      const aggregatorsList = await wallet.openapi.getBridgeAggregatorList();
      if (aggregatorsList.length) {
        set({ aggregatorsListInit: true, aggregatorsList });
      }
    },
    async fetchSupportedChains() {
      const chains = await wallet.openapi.getBridgeSupportChainV2();
      if (chains.length) {
        const mappings = Object.values(CHAINS).reduce((result, chain) => {
          result[chain.serverId] = chain.enum;
          return result;
        }, {} as Record<string, CHAINS_ENUM>);
        set({
          supportedChains: chains.map(
            (chain) => findChainByServerID(chain)?.enum || mappings[chain]
          ),
        });
      }
    },
  }),
  createExtensionStoreOptions<BridgeStore, 'bridge'>({
    autoHydrate: false,
    storageKey: 'bridge',
    partialize(state) {
      return {
        selectedChain: state.selectedChain,
        selectedFromToken: state.selectedFromToken,
        selectedToToken: state.selectedToToken,
        selectedAggregators: state.selectedAggregators,
        txQuotes: state.txQuotes,
        unlimitedAllowance: state.unlimitedAllowance,
        sortIncludeGasFee: state.sortIncludeGasFee,
        firstOpen: state.firstOpen,
      };
    },
    merge(persistedState, currentState) {
      const selectedChain =
        persistedState.selectedChain ?? currentState.selectedChain;
      return {
        ...currentState,
        ...persistedState,
        selectedAggregators: persistedState.selectedAggregators || [],
        $$initialSelectedChain: selectedChain || null,
      };
    },
    onError(error) {
      console.error('[bridgeStore]', error);
    },
  })
);

export const initializeBridgeStore = () => useBridgeStore.getState().init();

export const bridgeActions: BridgeActions = new Proxy({} as BridgeActions, {
  get(_target, property: keyof BridgeActions) {
    return useBridgeStore.getState()[property];
  },
});
