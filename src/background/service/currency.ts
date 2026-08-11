import { createPersistStore, patchPersistStore } from 'background/utils';
import openapiService, { CurrencyItem } from './openapi';
import { z } from 'zod';

const currencyItemSchema = z.object({
  symbol: z.string(),
  code: z.string(),
  logo_url: z.string(),
  usd_rate: z.number(),
  is_prefix: z.boolean(),
});

const currencyListSchema = z.array(currencyItemSchema);

const currencyStoreSchema = z.object({
  currencyList: currencyListSchema.default(() => []),
  updatedAt: z.number().default(0),
  currency: z.string().min(1).default('USD'),
});

export type CurrencyStore = z.output<typeof currencyStoreSchema>;

const createCurrencyStoreTemplate = (): CurrencyStore =>
  currencyStoreSchema.parse({});

class CurrencyService {
  store: CurrencyStore = createCurrencyStoreTemplate();
  timer: ReturnType<typeof setInterval> | null = null;

  init = async () => {
    this.store = await createPersistStore<CurrencyStore>({
      name: 'currency',
      template: createCurrencyStoreTemplate(),
      schema: currencyStoreSchema,
    });

    if (!currencyListSchema.safeParse(this.store.currencyList).success) {
      this.store.currencyList = [];
    }
    if (!z.number().safeParse(this.store.updatedAt).success) {
      this.store.updatedAt = 0;
    }
    if (!z.string().min(1).safeParse(this.store.currency).success) {
      this.store.currency = 'USD';
    }

    this.resetTimer();
  };

  getStore = () => {
    return {
      currencyList: this.store.currencyList || [],
      updatedAt: this.store.updatedAt || 0,
      currency: this.store.currency || 'USD',
    };
  };

  getCurrency = () => {
    return this.store.currency || 'USD';
  };

  setCurrency = (currency: CurrencyItem['code']) => {
    this.patchStore({ currency: currency || 'USD' });
  };

  patchStore = (partials: Partial<CurrencyStore>) => {
    patchPersistStore(this.store, partials);
  };

  syncCurrencyList = async (force = false) => {
    const currentStore = this.getStore();
    const shouldSkip =
      !force && Date.now() - currentStore.updatedAt < 9 * 60 * 1000;

    if (shouldSkip) {
      return currentStore.currencyList;
    }

    try {
      const currencyList = await openapiService.getCurrencyList();
      this.patchStore({
        currencyList,
        updatedAt: Date.now(),
      });
      return currencyList;
    } catch (error) {
      console.error('fetch currency list error: ', error);
      return currentStore.currencyList;
    }
  };

  resetTimer = () => {
    const periodInMinutes = 10;
    if (this.timer) {
      clearInterval(this.timer);
    }

    this.syncCurrencyList(true);
    this.timer = setInterval(() => {
      this.syncCurrencyList();
    }, periodInMinutes * 60 * 1000);
  };
}

export default new CurrencyService();
