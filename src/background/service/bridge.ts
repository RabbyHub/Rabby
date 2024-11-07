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
  autoSlippage: boolean;
  isCustomSlippage?: boolean;
  slippage: string;

  selectedChain: CHAINS_ENUM | null;
  selectedFromToken?: TokenItem;
  selectedToToken?: TokenItem;
  selectedAggregators?: string[];
  txQuotes?: Record<string, BridgeRecord>;

  /**
   * @deprecated
   */
  unlimitedAllowance: boolean;
  /**
   * @deprecated
   */
  sortIncludeGasFee?: boolean;
  /**
   * @deprecated
   */
  firstOpen: boolean;
};

class BridgeService {
  store: BridgeServiceStore = {
    selectedChain: null,
    selectedFromToken: undefined,
    selectedToToken: undefined,
    selectedAggregators: undefined,
    unlimitedAllowance: false,
    sortIncludeGasFee: true,
    firstOpen: true,
    autoSlippage: true,
    slippage: '1',
  };

  init = async () => {
    const storage = await createPersistStore<BridgeServiceStore>({
      name: 'bridge',
      template: {
        selectedChain: null,
        unlimitedAllowance: false,
        sortIncludeGasFee: true,
        txQuotes: {},
        firstOpen: true,
        autoSlippage: true,
        slippage: '1',
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

  setBridgeSettingFirstOpen = (bool: boolean) => {
    this.store.firstOpen = bool;
  };

  txQuotes: Record<string, BridgeRecord> = {};

  addTx = (chain: CHAINS_ENUM, data: string, info: BridgeRecord) => {
    this.txQuotes[`${chain}-${data}`] = info;
  };

  postBridge = (chain: CHAINS_ENUM, hash: string, tx: Tx) => {
    const { postBridgeHistory } = openapiService;
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

  setAutoSlippage = (auto: boolean) => {
    this.store.autoSlippage = auto;
  };

  setIsCustomSlippage = (isCustomSlippage: boolean) => {
    this.store.isCustomSlippage = isCustomSlippage;
  };

  setSlippage = (slippage: string) => {
    this.store.slippage = slippage;
  };
}

export default new BridgeService();
