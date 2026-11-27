import { useCallback, useEffect, useMemo, useState } from 'react';
import { useWallet, useWalletRequest } from 'ui/utils';

import { findChainByServerID, DisplayChainWithWhiteLogo } from '@/utils/chain';
import { filterChainWithBalance, normalizeChainList } from '@/utils/account';
import { useRabbyDispatch, useRabbySelector } from '../store';
import { useLatest, useMemoizedFn, useRequest } from 'ahooks';

/** @deprecated import from '@/utils/chain' directly  */
export type { DisplayChainWithWhiteLogo };

export default function useCurrentBalance(
  account: string | undefined,
  opts?: {
    noNeedBalance?: boolean;
    update?: boolean;
    /**
     * @description in the future, only nonce >= 0, the fetching will be triggered
     */
    nonce?: number;
    initBalanceFromLocalCache?: boolean;
  }
) {
  const {
    update = false,
    noNeedBalance = false,
    nonce = 0,
    initBalanceFromLocalCache = false,
  } = opts || {};

  const wallet = useWallet();
  const [evmBalance, setEvmBalance] = useState<number | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [success, setSuccess] = useState(true);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceFromCache, setBalanceFromCache] = useState(
    initBalanceFromLocalCache
  );
  // The address this hook is showing now. A response requested for another
  // address is dropped, so a slow one cannot overwrite the current balance.
  const latestAccount = useLatest(account);
  const [matteredChainBalances, setChainBalances] = useState<
    DisplayChainWithWhiteLogo[]
  >([]);
  const [appChainIds, setAppChainIds] = useState<string[]>([]);
  const [missingList, setMissingList] = useState<string[]>();

  const dispatch = useRabbyDispatch();

  const { runAsync: getInMemoryAddressBalance } = useRequest(
    wallet.getInMemoryAddressBalance,
    {
      onSuccess(options, [requestedAccount]) {
        const { total_usd_value, chain_list } = options;
        const evmUsdValue =
          'evmUsdValue' in options ? (options.evmUsdValue as number) : 0;
        const chainIds =
          'appChainIds' in options ? (options.appChainIds as string[]) : [];
        if (requestedAccount !== latestAccount.current) return;
        setAppChainIds(chainIds);
        setEvmBalance(evmUsdValue);
        setBalance(total_usd_value);
        setSuccess(true);
        const chainList = normalizeChainList(chain_list);

        dispatch.accountToDisplay.getAllAccountsToDisplay();

        setChainBalances(chainList);
        setBalanceLoading(false);
        setBalanceFromCache(false);
      },
      onError(e, [requestedAccount]) {
        if (requestedAccount !== latestAccount.current) return;
        setBalanceLoading(false);
        try {
          const { error_code, err_chain_ids } = JSON.parse(e.message);
          if (error_code === 2) {
            const chainNames = err_chain_ids.map((serverId: string) => {
              const chain = findChainByServerID(serverId);
              return chain?.name;
            });
            setMissingList(chainNames);
            setSuccess(true);
            // AppChain 余额可能已更新到本地缓存，回读一次同步页面显示
            if (requestedAccount) {
              wallet
                .getAddressCacheBalance(requestedAccount)
                .then((cacheData) => {
                  if (!cacheData) return;
                  if (requestedAccount !== latestAccount.current) return;
                  setBalance(cacheData.total_usd_value);
                  setEvmBalance(cacheData.evmUsdValue || 0);
                  setAppChainIds(cacheData.appChainIds || []);
                  setChainBalances(normalizeChainList(cacheData.chain_list));
                  dispatch.accountToDisplay.getAllAccountsToDisplay();
                })
                .catch(() => undefined);
            }
            return;
          }
        } catch (e) {
          console.error(e);
        }
        setSuccess(false);
      },
      manual: true,
    }
  );

  const getCurrentBalance = useMemoizedFn(async (force = false) => {
    if (!account || noNeedBalance) {
      // a dropped response for the previous address never clears this
      setBalanceLoading(false);
      return;
    }
    setBalanceLoading(true);
    const cacheData = await wallet.getAddressCacheBalance(account);
    const cacheExpired = cacheData
      ? await wallet.isBalanceDbCacheExpired(account)
      : true;
    const apiLevel = await wallet.getAPIConfig([], 'ApiLevel', false);
    if (account !== latestAccount.current) return;
    if (cacheData) {
      setBalanceFromCache(true);
      setBalance(cacheData.total_usd_value);
      setEvmBalance(cacheData.evmUsdValue || 0);
      setAppChainIds(cacheData.appChainIds || []);
      const chainList = normalizeChainList(cacheData.chain_list);
      setChainBalances(chainList);

      if (update) {
        if (apiLevel < 2 && (force || cacheExpired)) {
          setBalanceLoading(true);
          await getInMemoryAddressBalance(account, force);
        } else {
          setBalanceLoading(false);
        }
      } else {
        setBalanceLoading(false);
      }
    } else {
      if (apiLevel < 2) {
        await getInMemoryAddressBalance(account, force);
        if (account !== latestAccount.current) return;
        setBalanceLoading(false);
        setBalanceFromCache(false);
      } else {
        setBalanceLoading(false);
      }
    }
  });

  const refresh = useCallback(async () => {
    await getCurrentBalance(true);
  }, [getCurrentBalance]);

  const isCurrentBalanceExpired = useCallback(async () => {
    if (!account) return false;

    try {
      return wallet.isBalanceDbCacheExpired(account.toLowerCase());
    } catch (error) {
      return false;
    }
  }, [account, wallet]);

  useEffect(() => {
    if (nonce < 0) return;

    getCurrentBalance();
    if (!noNeedBalance) {
      wallet.getAddressCacheBalance(account).then((cache) => {
        if (account !== latestAccount.current) return;
        setChainBalances(cache ? normalizeChainList(cache?.chain_list) : []);
      });
    }
  }, [account, nonce]);

  const chainBalancesWithValue = useMemo(() => {
    return filterChainWithBalance(matteredChainBalances);
  }, [matteredChainBalances]);

  return {
    balance,
    evmBalance,
    appChainIds,
    matteredChainBalances,
    chainBalancesWithValue,
    isCurrentBalanceExpired,
    // getInMemoryAddressBalance,
    success,
    balanceLoading,
    balanceFromCache,
    refreshBalance: refresh,
    fetchBalance: getCurrentBalance,
    missingList,
  };
}
