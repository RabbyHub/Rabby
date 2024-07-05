import { createModel } from '@rematch/core';
import { RootModel } from '.';
import { CHAINS, CHAINS_ENUM } from 'consts';
import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import { BridgeServiceStore } from '@/background/service/bridge';
import { BridgeAggregator } from '@/background/service/openapi';

export const bridge = createModel<RootModel>()({
  name: 'bridge',

  state: {
    supportedChains: [],
    aggregatorsListInit: false,
    aggregatorsList: [],
    selectedAggregators: [],
    selectedDex: null,
    selectedChain: null,
    unlimitedAllowance: false,
    sortIncludeGasFee: true,
    $$initialSelectedChain: null,
  } as Partial<BridgeServiceStore> & {
    $$initialSelectedChain: CHAINS_ENUM | null;
    aggregatorsList: BridgeAggregator[];
    aggregatorsListInit: boolean;
    supportedChains: CHAINS_ENUM[];
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
    async syncState(key: keyof BridgeServiceStore | undefined, store) {
      const data = await store.app.wallet.getBridgeData(key);
      console.log('data', data);
      this.fetchAggregatorsList();
      this.fetchSupportedChains();

      this.setField(
        key
          ? {
              [key]: data,
            }
          : {
              ...(data as BridgeServiceStore),
            }
      );

      if (!key) {
        this.setField({
          $$initialSelectedChain:
            (data as BridgeServiceStore).selectedChain || null,
        });
      }
    },

    async setSelectedAggregators(selectedAggregators: string[], store) {
      console.log('bridge set list');
      await store.app.wallet.setBridgeAggregators(selectedAggregators);

      this.setField({
        selectedAggregators,
      });
    },

    async setSelectedChain(selectedChain: CHAINS_ENUM, store) {
      await store.app.wallet.setBridgeSelectedChain(selectedChain);

      this.setField({
        selectedChain,
      });
    },

    async setSelectedFromToken(
      selectedFromToken: TokenItem | undefined,
      store
    ) {
      await store.app.wallet.setBridgeSelectedFromToken(selectedFromToken);

      this.setField({
        selectedFromToken,
      });
    },

    async setSelectedToToken(selectedToToken: TokenItem | undefined, store) {
      await store.app.wallet.setBridgeSelectedToToken(selectedToToken);

      this.setField({
        selectedToToken,
      });
    },

    async setUnlimitedAllowance(unlimitedAllowance: boolean, store) {
      await store.app.wallet.setBridgeUnlimitedAllowance(unlimitedAllowance);

      this.setField({
        unlimitedAllowance,
      });
    },

    async getSwapSortIncludeGasFee(_: void, store) {
      const sortIncludeGasFee = await store.app.wallet.getBridgeSortIncludeGasFee();
      this.setField({
        sortIncludeGasFee,
      });
    },

    async setSwapSortIncludeGasFee(bool: boolean, store) {
      await store.app.wallet.setBridgeSortIncludeGasFee(bool);
      this.getSwapSortIncludeGasFee();
    },

    async fetchAggregatorsList(_: void, store) {
      const aggregatorsList = await store.app.wallet.openapi.getBridgeAggregatorList();
      if (aggregatorsList.length) {
        this.setField({
          aggregatorsListInit: true,
          aggregatorsList,
        });
      }
    },

    async fetchSupportedChains(_: void, store) {
      const chains = await store.app.wallet.openapi.getBridgeSupportChain();
      if (chains.length) {
        const mappings = Object.values(CHAINS).reduce((acc, chain) => {
          acc[chain.serverId] = chain.enum;
          return acc;
        }, {} as Record<string, CHAINS_ENUM>);
        this.setField({
          supportedChains: chains.map((item) => mappings[item]),
        });
      }
    },
  }),
});
