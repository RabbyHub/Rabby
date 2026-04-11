import { createModel } from '@rematch/core';
import { RootModel } from '.';
import { CurrencyItem } from '@/background/service/openapi';

interface CurrencyState {
  currency: string;
  currencyList: CurrencyItem[];
  updatedAt: number;
}

export const currency = createModel<RootModel>()({
  name: 'currency',

  state: {
    currency: 'USD',
    currencyList: [],
    updatedAt: 0,
  } as CurrencyState,

  reducers: {
    setField(state, payload: Partial<typeof state>) {
      return Object.keys(payload || {}).reduce(
        (accu, key) => {
          accu[key] = payload[key];
          return accu;
        },
        { ...state }
      );
    },
  },

  effects: (dispatch) => ({
    async init() {
      await this.getCurrencyStore();
      this.syncCurrencyList();
    },

    async getCurrencyStore(_: void, store) {
      const currencyStore = await store.app.wallet.getCurrencyStore();
      dispatch.currency.setField(currencyStore);
      return currencyStore as CurrencyState;
    },

    async setCurrency(currency: string, store) {
      dispatch.currency.setField({ currency });
      await store.app.wallet.setCurrency(currency);
      await dispatch.currency.getCurrencyStore();
    },

    async syncCurrencyList(payload: { force?: boolean } = {}, store) {
      const { force = false } = payload;
      const currencyList = await store.app.wallet.syncCurrencyList(force);
      await dispatch.currency.getCurrencyStore();
      return currencyList as CurrencyItem[];
    },
  }),
});
