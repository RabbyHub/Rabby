import type { Account } from '@/background/service/preference';
import { KEYRING_CLASS } from '@/constant';
import { createModel } from '@rematch/core';
import { DisplayedKeryring } from 'background/service/keyring';
import { TotalBalanceResponse } from 'background/service/openapi';
import { RootModel } from '.';

interface AccountState {
  currentAccount: null | Account;
  visiableAccounts: Account[];
  hiddenAccounts: Account[];
  alianName: string;
  keyrings: DisplayedKeryring[];
  balanceMap: {
    [address: string]: TotalBalanceResponse;
  };

  mnemonicAccounts: DisplayedKeryring[];
}

export const account = createModel<RootModel>()({
  name: 'account',

  state: {
    currentAccount: null,
    alianName: '',
    visiableAccounts: [],
    hiddenAccounts: [],
    keyrings: [],
    balanceMap: {},
    mnemonicAccounts: [],
  } as AccountState,

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

  selectors: (slice) => {
    return {
      isShowMnemonic() {
        return slice((account) => account.mnemonicAccounts.length <= 0);
      },
    };
  },

  effects: (dispatch) => ({
    init() {
      return this.getCurrentAccountAsync();
    },
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

    async getAllClassAccountsAsync(_?, store?) {
      const keyrings = await store.app.wallet.getAllClassAccounts<
        DisplayedKeryring[]
      >();
      dispatch.account.setField({ keyrings });
      return keyrings;
    },

    async getAllVisibleAccountsAsync(_, store) {
      const visiableAccounts = await store.app.wallet.getAllVisibleAccounts<
        Account[]
      >();
      dispatch.account.setField({ visiableAccounts });
      return visiableAccounts;
    },

    async getAllHiddenAccountsAsync(_, store) {
      const hiddenAccounts = await store.app.wallet.getHiddenAddresses<
        Account[]
      >();
      dispatch.account.setField({ hiddenAccounts });
      return hiddenAccounts;
    },

    async getTypedMnemonicAccountsAsync(_?, store?) {
      const mnemonicAccounts = await store.app.wallet.getTypedAccounts(
        KEYRING_CLASS.MNEMONIC
      );
      dispatch.account.setField({ mnemonicAccounts });
    },
  }),
});
