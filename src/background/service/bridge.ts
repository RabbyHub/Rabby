import { CHAINS_ENUM } from '@debank/common';
import { createPersistStore } from 'background/utils';
import { Tx } from '@rabby-wallet/rabby-api/dist/types';

import { openapiService } from 'background/service';
import { TokenItem } from './openapi';

export type BridgeRecord = {
  aggregator_id: string;
  bridge_id: string;
  from_chain_id: string;
  from_token_id: string;
  from_token_amount: string | number;
  to_chain_id: string;
  to_token_id: string;
  to_token_amount: string | number;
  tx: Partial<Tx>;
  rabby_fee: number;
};

export type BridgeServiceStore = {
  selectedChain: CHAINS_ENUM | null;
  selectedFromToken?: TokenItem;
  selectedToToken?: TokenItem;
  selectedAggregators?: string[];
  unlimitedAllowance: boolean;
  sortIncludeGasFee?: boolean;
  txQuotes?: Record<string, BridgeRecord>;
};

class BridgeService {
  store: BridgeServiceStore = {
    selectedChain: null,
    selectedFromToken: undefined,
    selectedToToken: undefined,
    selectedAggregators: undefined,
    unlimitedAllowance: false,
    sortIncludeGasFee: true,
  };

  init = async () => {
    const storage = await createPersistStore<BridgeServiceStore>({
      name: 'bridge',
      template: {
        selectedChain: null,
        unlimitedAllowance: false,
        sortIncludeGasFee: true,
        txQuotes: {},
      },
    });

    this.store = storage || this.store;
  };

  getBridgeData = (key?: keyof BridgeServiceStore) => {
    return key ? this.store[key] : { ...this.store };
  };

  getBridgeAggregators = () => {
    return this.store.selectedAggregators;
  };

  setBridgeAggregators = (selectedAggregators: string[]) => {
    this.store.selectedAggregators = [...selectedAggregators];
  };

  getSelectedChain = () => {
    return this.store.selectedChain;
  };

  setSelectedChain = (chain: CHAINS_ENUM) => {
    this.store.selectedChain = chain;
  };

  getSelectedFromToken = () => {
    return this.store.selectedFromToken;
  };
  getSelectedToToken = () => {
    return this.store.selectedToToken;
  };

  setSelectedFromToken = (token?: TokenItem) => {
    this.store.selectedFromToken = token;
  };
  setSelectedToToken = (token?: TokenItem) => {
    this.store.selectedToToken = token;
  };

  getUnlimitedAllowance = () => {
    return this.store.unlimitedAllowance;
  };

  setUnlimitedAllowance = (bool: boolean) => {
    this.store.unlimitedAllowance = bool;
  };

  getBridgeSortIncludeGasFee = () => {
    return this.store.sortIncludeGasFee;
  };

  setBridgeSortIncludeGasFee = (bool: boolean) => {
    this.store.sortIncludeGasFee = bool;
  };

  txQuotes: Record<string, BridgeRecord> = {};

  addTx = (chain: CHAINS_ENUM, data: string, info: BridgeRecord) => {
    this.txQuotes[`${chain}-${data}`] = info;
  };

  postBridge = (chain: CHAINS_ENUM, hash: string, tx: Tx) => {
    const { postBridgeHistory } = openapiService;
    // const { txQuotes } = this;
    const key = `${chain}-${tx.data}`;
    const data = { ...this.txQuotes };
    const quoteInfo = data[key];
    if (quoteInfo) {
      delete data[key];
      this.txQuotes = data;
      return postBridgeHistory({
        ...quoteInfo,
        tx,
        tx_id: hash,
      });
    }
  };
}

export default new BridgeService();
