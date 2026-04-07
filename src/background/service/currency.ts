import { createPersistStore } from 'background/utils';
import openapiService, { CurrencyItem } from './openapi';

export interface CurrencyStore {
  currencyList: CurrencyItem[];
  updatedAt: number;
  currency: string;
}

class CurrencyService {
  store!: CurrencyStore;
  timer: ReturnType<typeof setInterval> | null = null;

  init = async () => {
    this.store = await createPersistStore<CurrencyStore>({
      name: 'currency',
      template: {
        currencyList: [],
        updatedAt: 0,
        currency: 'USD',
      },
    });

    if (!Array.isArray(this.store.currencyList)) {
      this.store.currencyList = [];
    }
    if (!this.store.updatedAt) {
      this.store.updatedAt = 0;
    }
    if (!this.store.currency) {
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
    this.store.currency = currency || 'USD';
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
      this.store.currencyList = currencyList;
      this.store.updatedAt = Date.now();
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
