import { createModel } from '@rematch/core';

import { RootModel } from '.';
import { DisplayedKeryring } from '@/background/service/keyring';
import { sortAccountsByBalance } from '../utils/account';

type IDisplayedAccount = Required<DisplayedKeryring['accounts'][number]>;
export type IDisplayedAccountWithBalance = IDisplayedAccount & {
  balance: number;
  byImport?: boolean;
};

type IState = {
  loadingAccounts: boolean;
  accountsList: IDisplayedAccountWithBalance[];
};

export const accountToDisplay = createModel<RootModel>()({
  name: 'accountToDisplay',
  state: {
    loadingAccounts: false,
    accountsList: [],
  } as IState,
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
  },
  effects: (dispatch) => ({
    async getAllAccountsToDisplay(_?, store?) {
      dispatch.accountToDisplay.setField({ loadingAccounts: true });

      const [
        displayedKeyrings,
        allAlianNames,
        allContactNames,
      ] = await Promise.all([
        store.app.wallet.getAllVisibleAccounts(),
        store.app.wallet.getAllAlianName(),
        store.app.wallet.getContactsByMap(),
      ]);

      const result = await Promise.all<IDisplayedAccountWithBalance>(
        displayedKeyrings
          .map((item) => {
            return item.accounts.map((account) => {
              return {
                ...account,
                type: item.type,
                byImport: item.byImport,
                alianName:
                  allContactNames[account?.address?.toLowerCase()]?.name ||
                  allAlianNames[account?.address?.toLowerCase()],
                keyring: item.keyring,
              };
            });
          })
          .flat(1)
          .map(async (item) => {
            let balance = await store.app.wallet.getAddressCacheBalance(
              item?.address
            );
            if (!balance) {
              balance = await store.app.wallet.getAddressBalance(item?.address);
            }
            return {
              ...item,
              balance: balance?.total_usd_value || 0,
            };
          })
      );
      dispatch.accountToDisplay.setField({ loadingAccounts: false });

      if (result) {
        const withBalanceList = sortAccountsByBalance(result);
        dispatch.accountToDisplay.setField({ accountsList: withBalanceList });
      }
    },
  }),
});
