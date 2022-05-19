import type { Account } from '@/background/service/preference';
import { createModel } from '@rematch/core';
import { RootModel } from '.';

export const account = createModel<RootModel>()({
  name: 'account',
  state: {
    currentAccount: null as null | Account,

    alianName: '',
  },
  reducers: {
    setField(state, payload: Partial<typeof state>) {
      return Object.keys(payload).reduce(
        (accu, key) => {
          accu[key] = payload[key];
          return accu;
        },
        { ...state }
      );
    },
    setCurrentAccount(
      state,
      payload: { currentAccount: typeof state.currentAccount }
    ) {
      return { ...state, currentAccount: payload.currentAccount };
    },
  },
  effects: (dispatch) => ({
    async getCurrentAccountAsync(_?: any, store?) {
      const account: Account = await store.app.wallet.getCurrentAccount<Account>();
      if (account) {
        dispatch.account.setCurrentAccount({ currentAccount: account });
      }

      return account;
    },
    async changeAccountAsync(account: Account, store) {
      const { address, type, brandName } = account;
      const nextVal: Account = { address, type, brandName };

      await store.app.wallet.changeAccount(nextVal);
      dispatch.account.setCurrentAccount({ currentAccount: nextVal });
    },
    async getAlianNameAsync(address: string, store) {
      const name = await store.app.wallet.getAlianName<string>(address);

      dispatch.account.setField({ alianName: name });
      return name;
    },
  }),
});
