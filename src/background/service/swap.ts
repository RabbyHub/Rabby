import { DEX_ENUM } from '@rabby-wallet/rabby-swap';
import { CHAINS_ENUM } from '@debank/common';
import { createPersistStore } from 'background/utils';
import { GasCache, ChainGas } from './preference';

export type SwapServiceStore = {
  gasPriceCache: GasCache;
  selectedDex: DEX_ENUM | null;
  selectedChain: CHAINS_ENUM;
};

class SwapService {
  store: SwapServiceStore = {
    gasPriceCache: {},
    selectedChain: CHAINS_ENUM.ETH,
    selectedDex: null,
  };

  init = async () => {
    const storage = await createPersistStore<SwapServiceStore>({
      name: 'swap',
      template: {
        gasPriceCache: {},
        selectedChain: CHAINS_ENUM.ETH,
        selectedDex: null,
      },
    });
    this.store = storage || this.store;
  };

  getLastTimeGasSelection = (chainId: keyof GasCache) => {
    return this.store.gasPriceCache[chainId];
  };

  updateLastTimeGasSelection = (chainId: keyof GasCache, gas: ChainGas) => {
    this.store.gasPriceCache = {
      ...this.store.gasPriceCache,
      [chainId]: gas,
    };
  };

  getSelectedDex = () => {
    return this.store.selectedDex;
  };

  setSelectedDex = (dexId: DEX_ENUM) => {
    this.store.selectedDex = dexId;
  };

  getSelectedChain = () => {
    return this.store.selectedChain;
  };

  setSelectedChain = (chain: CHAINS_ENUM) => {
    this.store.selectedChain = chain;
  };
}

export default new SwapService();
