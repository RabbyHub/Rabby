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
const chainSchema = z.custom<CHAINS_ENUM>((value) =>
  Object.values(CHAINS_ENUM).includes(value as CHAINS_ENUM)
);
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
  /** @deprecated */
  gasPriceCache: gasCacheSchema.default(() => ({})),
  /** @deprecated */
  unlimitedAllowance: z.boolean().default(false),
  /** @deprecated */
  selectedDex: dexSchema.nullable().default(null),
  /** @deprecated */
  viewList: viewListSchema.default(() => ({} as Record<ViewKey, boolean>)),
  /** @deprecated */
  tradeList: viewListSchema.default(() => ({} as Record<ViewKey, boolean>)),
  /** @deprecated */
  sortIncludeGasFee: z.boolean().default(true),
  preferMEVGuarded: z.boolean().default(false),
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
      const values = Object.values(DEX_ENUM);
      if (storage.selectedDex && !values.includes(storage.selectedDex)) {
        storage.selectedDex = null;
      }
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

  getLastTimeGasSelection = (chainId: keyof GasCache): ChainGas | null => {
    const cache = this.store.gasPriceCache[chainId];
    if (cache && cache.lastTimeSelect === 'gasPrice') {
      if (Date.now() <= (cache.expireAt || 0)) {
        return cache;
      } else if (cache.gasLevel) {
        return {
          lastTimeSelect: 'gasLevel',
          gasLevel: cache.gasLevel,
        };
      } else {
        return null;
      }
    } else {
      return cache;
    }
  };

  updateLastTimeGasSelection = (chainId: keyof GasCache, gas: ChainGas) => {
    if (gas.lastTimeSelect === 'gasPrice') {
      this.store.gasPriceCache = {
        ...this.store.gasPriceCache,
        [chainId]: {
          ...this.store.gasPriceCache[chainId],
          ...gas,
          expireAt: Date.now() + 3600000, // custom gasPrice will expire at 1h later
        },
      };
    } else {
      this.store.gasPriceCache = {
        ...this.store.gasPriceCache,
        [chainId]: {
          ...this.store.gasPriceCache[chainId],
          ...gas,
        },
      };
    }
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

  getUnlimitedAllowance = () => {
    return this.store.unlimitedAllowance;
  };

  setUnlimitedAllowance = (bool: boolean) => {
    this.store.unlimitedAllowance = bool;
  };

  getSwapViewList = () => {
    return this.store.viewList;
  };

  setSwapView = (id: ViewKey, bool: boolean) => {
    if (!this.store.viewList) {
      this.store.viewList = {} as SwapServiceStore['viewList'];
    }
    this.store.viewList = {
      ...this.store.viewList,
      [id]: bool,
    };
  };

  getSwapTradeList = () => {
    return this.store.tradeList;
  };

  setSwapTrade = (dexId: ViewKey, bool: boolean) => {
    if (!this.store.tradeList) {
      this.store.tradeList = {} as SwapServiceStore['tradeList'];
    }
    this.store.tradeList = {
      ...this.store.tradeList,
      [dexId]: bool,
    };
  };

  getSwapSortIncludeGasFee = () => {
    return this.store.sortIncludeGasFee ?? true;
  };

  setSwapSortIncludeGasFee = (bool: boolean) => {
    this.store.sortIncludeGasFee = bool;
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
    return this.store.preferMEVGuarded ?? false;
  };

  setSwapPreferMEVGuarded = (bool: boolean) => {
    this.store.preferMEVGuarded = bool;
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
