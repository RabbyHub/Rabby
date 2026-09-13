import PQueue from 'p-queue';
import { create } from 'zustand';

import type { DisplayedKeryring } from '@/background/service/keyring';
import type { TotalBalanceResponse } from '@/background/service/openapi';
import { wallet } from '@/ui/wallet';
import { sortAccountsByBalance } from '@/ui/utils/account';
import { filterMyAccounts } from '@/utils/account';

type IDisplayedAccount = Required<DisplayedKeryring['accounts'][number]>;

export type IDisplayedAccountWithBalance = IDisplayedAccount & {
  balance: number;
  byImport?: boolean;
  publicKey?: string;
  hdPathBasePublicKey?: string;
  hdPathType?: string;
};

export type AccountToDisplayState = {
  loadingAccounts: boolean;
  accountsList: IDisplayedAccountWithBalance[];
};

export type AccountToDisplayActions = {
  getAllAccountsToDisplay: () => Promise<void>;
  updateAllBalance: () => Promise<void>;
};

export type AccountToDisplayStore = AccountToDisplayState &
  AccountToDisplayActions;

export const getDefaultAccountToDisplayState = (): AccountToDisplayState => ({
  loadingAccounts: false,
  accountsList: [],
});

export const selectMyImportedAccounts = (state: AccountToDisplayState) =>
  state.accountsList.filter((item) => filterMyAccounts(item).isMyImported);

export const useAccountToDisplayStore = create<AccountToDisplayStore>()(
  (set, get) => ({
    ...getDefaultAccountToDisplayState(),

    async getAllAccountsToDisplay() {
      set({ loadingAccounts: true });
      try {
        const [displayedKeyrings, allAlianNames] = await Promise.all([
          wallet.getAllVisibleAccounts(),
          wallet.getAllAlianNameByMap(),
        ]);

        const result = await Promise.all<IDisplayedAccountWithBalance>(
          displayedKeyrings
            .flatMap((item) =>
              item.accounts.map((account) => ({
                ...account,
                address: account.address.toLowerCase(),
                type: item.type,
                byImport: item.byImport,
                alianName: allAlianNames[account.address.toLowerCase()]?.name,
                keyring: item.keyring,
                publicKey: item.publicKey,
              }))
            )
            .map(async (item) => {
              const [
                balanceResult,
                accountInfoResult,
              ] = await Promise.allSettled([
                wallet.getAddressCacheBalance(item.address),
                wallet.requestKeyring(
                  item.type,
                  'getAccountInfo',
                  null,
                  item.address
                ),
              ]);
              const balance: TotalBalanceResponse | null =
                balanceResult.status === 'fulfilled'
                  ? balanceResult.value
                  : null;
              const accountInfo:
                | {
                    hdPathBasePublicKey?: string;
                    hdPathType?: string;
                  }
                | null
                | undefined =
                accountInfoResult.status === 'fulfilled'
                  ? accountInfoResult.value
                  : undefined;

              return {
                ...item,
                balance: balance?.total_usd_value || 0,
                hdPathBasePublicKey: accountInfo?.hdPathBasePublicKey,
                hdPathType: accountInfo?.hdPathType,
              };
            })
        );

        set({ accountsList: sortAccountsByBalance(result) });
      } finally {
        set({ loadingAccounts: false });
      }
    },

    async updateAllBalance() {
      const queue = new PQueue({ concurrency: 10 });
      let hasError = false;
      const result = await queue.addAll(
        get().accountsList.map((item) => async () => {
          try {
            const balance = await wallet.getInMemoryAddressBalance(
              item.address
            );
            return {
              ...item,
              balance: balance?.total_usd_value || 0,
            };
          } catch {
            hasError = true;
            return item;
          }
        })
      );

      set({ accountsList: result });
      if (hasError) {
        throw new Error('update balance error');
      }
    },
  })
);

export const accountToDisplayActions: AccountToDisplayActions = new Proxy(
  {} as AccountToDisplayActions,
  {
    get(_target, property: keyof AccountToDisplayActions) {
      return useAccountToDisplayStore.getState()[property];
    },
  }
);
