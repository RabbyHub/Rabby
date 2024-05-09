import { createModel } from '@rematch/core';

import { RootModel } from '.';
import { DisplayedKeryring } from '@/background/service/keyring';
import { sortAccountsByBalance } from '../utils/account';
import PQueue from 'p-queue';
import { TotalBalanceResponse } from '@/background/service/openapi';

type IDisplayedAccount = Required<DisplayedKeryring['accounts'][number]>;
export type IDisplayedAccountWithBalance = IDisplayedAccount & {
  balance: number;
  byImport?: boolean;
  publicKey?: string;
  hdPathBasePublicKey?: string;
  hdPathType?: string;
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
    async getAllAccountsToDisplay(_: void, store) {
      dispatch.accountToDisplay.setField({ loadingAccounts: true });

      const [displayedKeyrings, allAlianNames] = await Promise.all([
        store.app.wallet.getAllVisibleAccounts(),
        store.app.wallet.getAllAlianNameByMap(),
      ]);
      const result = await Promise.all<IDisplayedAccountWithBalance>(
        displayedKeyrings
          .map((item) => {
            return item.accounts.map((account) => {
              return {
                ...account,
                address: account.address.toLowerCase(),
                type: item.type,
                byImport: item.byImport,
                alianName: allAlianNames[account?.address?.toLowerCase()]?.name,
                keyring: item.keyring,
                publicKey: item?.publicKey,
              };
            });
          })
          .flat(1)
          .map(async (item) => {
            let balance: TotalBalanceResponse | null = null;

            let accountInfo = {} as {
              hdPathBasePublicKey?: string;
              hdPathType?: string;
            };

            await Promise.allSettled([
              store.app.wallet.getAddressCacheBalance(item?.address),
              store.app.wallet.requestKeyring(
                item.type,
                'getAccountInfo',
                null,
                item.address
              ),
            ]).then(([res1, res2]) => {
              if (res1.status === 'fulfilled') {
                balance = res1.value;
              }
              if (res2.status === 'fulfilled') {
                accountInfo = res2.value;
              }
            });

            if (!balance) {
              balance = {
                total_usd_value: 0,
                chain_list: [],
              };
            }
            return {
              ...item,
              balance: balance?.total_usd_value || 0,
              hdPathBasePublicKey: accountInfo?.hdPathBasePublicKey,
              hdPathType: accountInfo?.hdPathType,
            };
          })
      );
      dispatch.accountToDisplay.setField({ loadingAccounts: false });

      if (result) {
        const withBalanceList = sortAccountsByBalance(result);
        dispatch.accountToDisplay.setField({ accountsList: withBalanceList });
      }
    },

    async updateAllBalance(_: void, store) {
      const queue = new PQueue({ concurrency: 10 });
      let hasError = false;
      const result = await queue.addAll(
        (store.accountToDisplay?.accountsList || []).map((item) => {
          return async () => {
            try {
              const balance = await store.app.wallet.getInMemoryAddressBalance(
                item.address
              );
              return {
                ...item,
                balance: balance?.total_usd_value || 0,
              };
            } catch (e) {
              hasError = true;
              return item;
            }
          };
        })
      );

      dispatch.accountToDisplay.setField({
        accountsList: result,
      });

      if (hasError) {
        throw new Error('update balance error');
      }
    },
  }),
});
