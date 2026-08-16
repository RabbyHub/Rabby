import type { CurrencyItem } from '@/background/service/openapi';
import type { CurrencyStore as CurrencyServiceStore } from '@/background/service/currency';
import { wallet } from '@/ui/wallet';
import { createExtensionStoreOptions } from './createStore/createExtensionStoreOptions';
import { createRabbyStore } from './createStore/createRabbyStore';

type CurrencyActions = {
  setCurrency: (currency: string) => void;
  syncCurrencyList: (force?: boolean) => Promise<CurrencyItem[]>;
};

export type CurrencyStore = CurrencyServiceStore & CurrencyActions;

export const useCurrencyStore = createRabbyStore<CurrencyStore>(
  (set) => ({
    currency: 'USD',
    currencyList: [],
    updatedAt: 0,

    setCurrency(currency) {
      set({ currency: currency || 'USD' });
    },
    syncCurrencyList(force = false) {
      return wallet.syncCurrencyList(force);
    },
  }),
  createExtensionStoreOptions<CurrencyStore, 'currency'>({
    autoHydrate: true,
    storageKey: 'currency',
    onError(error) {
      console.error('[currencyStore]', error);
    },
  })
);
