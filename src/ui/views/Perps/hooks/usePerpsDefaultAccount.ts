import { KEYRING_TYPE } from '@/constant';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { isSameAddress, useWallet } from '@/ui/utils';
import { useRequest } from 'ahooks';
import { sortBy, uniqBy } from 'lodash';
import { getPerpsSDK } from '../sdkManager';
import { ClearinghouseState } from '@rabby-wallet/hyperliquid-sdk';

export const usePerpsDefaultAccount = ({
  isPro = false,
}: {
  isPro?: boolean;
}) => {
  const dispatch = useRabbyDispatch();
  const wallet = useWallet();
  const accounts = useRabbySelector(
    (state) => state.accountToDisplay.accountsList
  );
  const sdk = getPerpsSDK();

  return useRequest(
    async () => {
      dispatch.perps.setInitialized(false);
      try {
        const currentAccount = await wallet.getPerpsCurrentAccount();
        const lastUsedAccount = await wallet.getPerpsLastUsedAccount();
        const recentlyAccount = currentAccount || lastUsedAccount;
        const isExist =
          recentlyAccount &&
          accounts.find(
            (item) =>
              isSameAddress(item.address, recentlyAccount.address) &&
              item.type === recentlyAccount.type
          );

        if (recentlyAccount && isExist) {
          dispatch.perps.setCurrentPerpsAccount(recentlyAccount);

          if (!isPro) {
            sdk.initAccount(recentlyAccount.address);
            dispatch.perps.subscribeToUserData({
              address: recentlyAccount.address,
              type: recentlyAccount.type,
              isPro,
            });
          }
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

            dispatch.perps.setClearinghouseStateMap(
              res.reduce((acc, item) => {
                acc[item.account.address.toLowerCase()] = item.info;
                return acc;
              }, {} as Record<string, ClearinghouseState | null>)
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
              if (!isPro) {
                sdk.initAccount(best.account.address);
                dispatch.perps.subscribeToUserData({
                  address: best.account.address,
                  type: best.account.type,
                  isPro,
                });
              }
            } else {
              const fallbackAccount = top10[0] || accounts[0];
              dispatch.perps.setCurrentPerpsAccount(fallbackAccount);
              if (!isPro) {
                sdk.initAccount(fallbackAccount.address);
                dispatch.perps.subscribeToUserData({
                  address: fallbackAccount.address,
                  type: fallbackAccount.type,
                  isPro,
                });
              }
            }
          }
        }
      } catch (e) {
        dispatch.perps.setCurrentPerpsAccount(accounts[0]);
        console.error('Error selecting only show account', e);
      }
    },
    {
      refreshDeps: [accounts.length],
    }
  );
};
