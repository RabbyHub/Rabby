import { CHAINS_ENUM } from '@debank/common';
import { createPersistStore, patchPersistStore } from 'background/utils';
import { Tx } from '@rabby-wallet/rabby-api/dist/types';
import { z } from 'zod';

import { openapiService } from 'background/service';
import { TokenItem } from './openapi';
import { getTxMatchData } from '@/utils/tempo';

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
  fee_rate: number;
  duration: number;
  slippage: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const tokenItemSchema = z.custom<TokenItem>(
  (value) =>
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.chain === 'string'
);
const chainSchema = z.string() as z.ZodType<CHAINS_ENUM>;
const isStringOrNumber = (value: unknown) =>
  typeof value === 'string' || typeof value === 'number';
const bridgeRecordSchema = z.custom<BridgeRecord>(
  (value) =>
    isRecord(value) &&
    typeof value.aggregator_id === 'string' &&
    typeof value.bridge_id === 'string' &&
    typeof value.from_chain_id === 'string' &&
    typeof value.from_token_id === 'string' &&
    isStringOrNumber(value.from_token_amount) &&
    typeof value.to_chain_id === 'string' &&
    typeof value.to_token_id === 'string' &&
    isStringOrNumber(value.to_token_amount) &&
    isRecord(value.tx) &&
    typeof value.rabby_fee === 'number' &&
    typeof value.slippage === 'number'
);

export const bridgeStoreSchema = z.object({
  selectedChain: chainSchema.nullable().default(null),
  selectedFromToken: tokenItemSchema.optional(),
  selectedToToken: tokenItemSchema.optional(),
  selectedAggregators: z.array(z.string()).default(() => []),
  txQuotes: z.record(z.string(), bridgeRecordSchema).default(() => ({})),
  /** @deprecated */
  unlimitedAllowance: z.boolean().default(false),
  /** @deprecated */
  sortIncludeGasFee: z.boolean().default(true),
  /** @deprecated */
  firstOpen: z.boolean().default(true),
});

export type BridgeServiceStore = z.output<typeof bridgeStoreSchema>;

const createBridgeStoreTemplate = (): BridgeServiceStore =>
  bridgeStoreSchema.parse({});

class BridgeService {
  store: BridgeServiceStore = createBridgeStoreTemplate();

  init = async () => {
    const storage = await createPersistStore<BridgeServiceStore>({
      name: 'bridge',
      template: createBridgeStoreTemplate(),
      schema: bridgeStoreSchema,
    });

    this.store = storage || this.store;
  };

  getBridgeData = (key?: keyof BridgeServiceStore) => {
    const state = bridgeStoreSchema.parse(this.store);
    return key ? state[key] : state;
  };

  patchStore = (partials: Partial<BridgeServiceStore>) => {
    patchPersistStore(this.store, partials);
  };

  getBridgeAggregators = () => {
    return this.store.selectedAggregators;
  };

  setBridgeAggregators = (selectedAggregators: string[]) => {
    this.patchStore({ selectedAggregators: [...selectedAggregators] });
  };

  getSelectedChain = () => {
    return this.store.selectedChain;
  };

  setSelectedChain = (chain: CHAINS_ENUM) => {
    this.patchStore({ selectedChain: chain });
  };

  getSelectedFromToken = () => {
    return this.store.selectedFromToken;
  };
  getSelectedToToken = () => {
    return this.store.selectedToToken;
  };

  setSelectedFromToken = (token?: TokenItem) => {
    this.patchStore({ selectedFromToken: token });
  };
  setSelectedToToken = (token?: TokenItem) => {
    this.patchStore({ selectedToToken: token });
  };

  getUnlimitedAllowance = () => {
    return this.store.unlimitedAllowance;
  };

  setUnlimitedAllowance = (bool: boolean) => {
    this.patchStore({ unlimitedAllowance: bool });
  };

  getBridgeSortIncludeGasFee = () => {
    return this.store.sortIncludeGasFee;
  };

  setBridgeSortIncludeGasFee = (bool: boolean) => {
    this.patchStore({ sortIncludeGasFee: bool });
  };

  setBridgeSettingFirstOpen = (bool: boolean) => {
    this.patchStore({ firstOpen: bool });
  };

  txQuotes: Record<string, BridgeRecord> = {};

  addTx = (chain: CHAINS_ENUM, data: string, info: BridgeRecord) => {
    this.txQuotes[`${chain}-${getTxMatchData({ data })}`] = info;
  };

  postBridge = (chain: CHAINS_ENUM, hash: string, tx: Tx) => {
    const { postBridgeHistory } = openapiService;
    const key = `${chain}-${getTxMatchData(tx as any)}`;
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
