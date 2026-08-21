import { DEX_ENUM } from '@rabby-wallet/rabby-swap';
import { CHAINS_ENUM } from '@debank/common';
import { createPersistStore, patchPersistStore } from 'background/utils';
import { GasCache, ChainGas } from './preference';
import { CEX, DEX } from '@/constant';
import { OpenApiService } from '@rabby-wallet/rabby-api';
import { openapiService } from 'background/service';
import { TokenItem } from './openapi';
import * as Sentry from '@sentry/browser';
import { getTxMatchData } from '@/utils/tempo';
import { findChain, findChainByEnum } from '@/utils/chain';
import { z } from 'zod';

type ViewKey = keyof typeof CEX | keyof typeof DEX;

const isTokenOnChain = (token: TokenItem | undefined, chain: CHAINS_ENUM) => {
  const chainInfo = findChainByEnum(chain);

  return !!token && !!chainInfo && token.chain === chainInfo.serverId;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const isTokenItem = (value: unknown): value is TokenItem =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  typeof value.chain === 'string';

const tokenItemSchema = z.custom<TokenItem>(isTokenItem);
// Rabby's supported chain list is updated independently of @debank/common,
// so valid runtime enums can be newer than its static CHAINS_ENUM values.
const chainSchema = z.string() as z.ZodType<CHAINS_ENUM>;
const dexSchema = z.custom<DEX_ENUM>((value) =>
  Object.values(DEX_ENUM).includes(value as DEX_ENUM)
);
const gasCacheSchema = z.custom<GasCache>(isRecord);
const viewListSchema = z.custom<Record<ViewKey, boolean>>(
  (value) =>
    isRecord(value) &&
    Object.values(value).every((item) => typeof item === 'boolean')
);

const swapStoreSchema = z.object({
  selectedChain: chainSchema.nullable().default(null),
  selectedFromToken: tokenItemSchema.optional(),
  selectedToToken: tokenItemSchema.optional(),
  autoSlippage: z.boolean().default(true),
  isCustomSlippage: z.boolean().optional(),
  slippage: z.string().default('0.1'),
  recentToTokens: z.array(tokenItemSchema).default(() => []),
  mevProtection: z.boolean().default(true),
});

export type SwapServiceStore = z.output<typeof swapStoreSchema>;

const createSwapStoreTemplate = () => swapStoreSchema.parse({});

class SwapService {
  store: SwapServiceStore = createSwapStoreTemplate();

  init = async () => {
    const storage = await createPersistStore<SwapServiceStore>({
      name: 'swap',
      template: createSwapStoreTemplate(),
      schema: swapStoreSchema,
    });
    if (storage) {
      if (storage.selectedChain) {
        if (!isTokenOnChain(storage.selectedFromToken, storage.selectedChain)) {
          storage.selectedFromToken = undefined;
        }
        if (!isTokenOnChain(storage.selectedToToken, storage.selectedChain)) {
          storage.selectedToToken = undefined;
        }
      }
    }
    this.store = storage || this.store;
  };

  getSwap = (key?: keyof SwapServiceStore) => {
    return key ? this.store[key] : this.store;
  };

  patchStore = (partials: Partial<SwapServiceStore>) => {
    patchPersistStore(this.store, partials);
  };

  getSelectedChain = () => {
    return this.store.selectedChain;
  };

  setSelectedChain = (chain: CHAINS_ENUM) => {
    this.store.selectedChain = chain;

    if (!isTokenOnChain(this.store.selectedFromToken, chain)) {
      this.store.selectedFromToken = undefined;
    }
    if (!isTokenOnChain(this.store.selectedToToken, chain)) {
      this.store.selectedToToken = undefined;
    }
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

  txQuotes: Record<
    string,
    Omit<Parameters<OpenApiService['postSwap']>[0], 'tx' | 'tx_id'>
  > = {};

  addTx = (
    chain: CHAINS_ENUM,
    data: string,
    quoteInfo: Omit<Parameters<OpenApiService['postSwap']>[0], 'tx' | 'tx_id'>
  ) => {
    this.txQuotes[`${chain}-${getTxMatchData({ data })}`] = quoteInfo;
  };

  postSwap = (
    chain: CHAINS_ENUM,
    hash: string,
    tx: Parameters<OpenApiService['postSwap']>[0]['tx']
  ) => {
    const { postSwap } = openapiService;
    const { txQuotes } = this;
    const key = `${chain}-${getTxMatchData(tx as any)}`;
    const quoteInfo = txQuotes[key];
    if (quoteInfo) {
      delete txQuotes[key];
      return postSwap({
        ...quoteInfo,
        tx,
        tx_id: hash,
      }).catch((err) => {
        Sentry.captureException(
          `postSwap error: ${JSON.stringify(err)}| ${JSON.stringify(quoteInfo)}`
        );
      });
    }
  };

  getSwapPreferMEVGuarded = () => {
    return this.store.mevProtection ?? true;
  };

  setSwapPreferMEVGuarded = (bool: boolean) => {
    this.store.mevProtection = bool;
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

  getRecentSwapToTokens = () => {
    return this.store.recentToTokens || [];
  };

  setRecentSwapToToken = (token: TokenItem) => {
    const recentToTokens = this.store.recentToTokens || [];
    this.store.recentToTokens = [
      token,
      ...recentToTokens.filter(
        (item) => item.id !== token.id || item.chain !== token.chain
      ),
    ].slice(0, 5);
  };
}

export default new SwapService();
