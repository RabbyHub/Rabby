import { KEYRING_TYPE } from '@/constant';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { useWallet } from '@/ui/utils';
import { useRequest } from 'ahooks';
import { sortBy, uniqBy } from 'lodash';
import { getPerpsSDK } from '../sdkManager';

export const usePerpsDefaultAccount = () => {
  const dispatch = useRabbyDispatch();
  const wallet = useWallet();
  const accounts = useRabbySelector(
    (state) => state.accountToDisplay.accountsList
  );
  const hasAccounts = accounts.length > 0;
  const sdk = getPerpsSDK();

  return useRequest(
    async () => {
      dispatch.perps.setInitialized(false);
      try {
        const currentAccount = await wallet.getPerpsCurrentAccount();
        const lastUsedAccount = await wallet.getPerpsLastUsedAccount();
        const recentlyAccount = currentAccount || lastUsedAccount;

        if (recentlyAccount) {
          dispatch.perps.setCurrentPerpsAccount(recentlyAccount);

          sdk.initAccount(recentlyAccount.address);
          dispatch.perps.subscribeToUserData(recentlyAccount.address);
        } else {
          const top10 = uniqBy(accounts, (item) => item.address.toLowerCase())
            .filter((item) => {
              return (
                item.type !== KEYRING_TYPE.GnosisKeyring &&
                item.type !== KEYRING_TYPE.WatchAddressKeyring
              );
            })
            .slice(0, 10);
          if (top10.length > 0) {
            const res = await Promise.all(
              top10.map(async (item) => {
                try {
                  const info = await sdk.info.getClearingHouseState(
                    item.address
                  );
                  return {
                    account: item,
                    info,
                  };
                } catch (e) {
                  return {
                    account: item,
                    info: null,
                  };
                }
              })
            );

            const best = sortBy(res, (item) => {
              return -(item.info?.marginSummary.accountValue
                ? Number(item.info?.marginSummary.accountValue)
                : 0);
            })[0];
            if (
              best &&
              Number(best.info?.marginSummary.accountValue || 0) > 0
            ) {
              dispatch.perps.setCurrentPerpsAccount(best.account);
              sdk.initAccount(best.account.address);
              dispatch.perps.subscribeToUserData(best.account.address);
            } else {
              const fallbackAccount = top10[0] || accounts[0];
              dispatch.perps.setCurrentPerpsAccount(fallbackAccount);
              sdk.initAccount(fallbackAccount.address);
              dispatch.perps.subscribeToUserData(fallbackAccount.address);
            }
          }
        }
      } catch (e) {
        dispatch.perps.setCurrentPerpsAccount(accounts[0]);
        console.error('Error selecting only show account', e);
      }
    },
    {
      refreshDeps: [hasAccounts],
    }
  );
};
