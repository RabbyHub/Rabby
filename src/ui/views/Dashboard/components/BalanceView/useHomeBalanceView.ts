/* eslint "react-hooks/exhaustive-deps": ["error"] */
/* eslint-enable react-hooks/exhaustive-deps */
import { useCallback, useEffect, useRef, useState } from 'react';
import { formChartData } from './useCurve';
import type { CurvePointCollection } from './useCurve';
import type { DisplayChainWithWhiteLogo } from '@/utils/chain';
import { useInterval } from 'react-use';
import { BALANCE_LOADING_TIMES } from '@/constant/timeout';
import { sleep } from '@/ui/utils';

const HomeBalanceViewCacheKey = 'HomeBalanceViewCacheKey';
type AddressCacheItem = {
  balance: number | null;
  matteredChainBalances: DisplayChainWithWhiteLogo[];
  chainBalancesWithValue: DisplayChainWithWhiteLogo[];
  originalCurveData: CurvePointCollection;
  // curveChartData: CurveChartData;
};
type AddressCacheDict = Record<string, AddressCacheItem>;
function cacheHomeBalanceView(newValue: AddressCacheDict) {
  localStorage.setItem(HomeBalanceViewCacheKey, JSON.stringify(newValue));

  return newValue;
}
function getHomeBalanceViewCache(): AddressCacheDict {
  const cache = localStorage.getItem(HomeBalanceViewCacheKey);

  try {
    const ret = cache ? JSON.parse(cache) : {};

    if (ret && typeof ret === 'object') {
      return ret;
    }

    return {};
  } catch (err) {
    console.error(err);
    return {};
  }
}
export function useHomeBalanceView(currentAddress?: string | undefined) {
  const [addressBalanceMap, setAddressBalanceMap] = useState(
    getHomeBalanceViewCache()
  );

  const cacheHomeBalanceByAddress = useCallback(
    (address: string, input: Partial<AddressCacheItem>) => {
      setAddressBalanceMap((prev) => {
        const next = { ...prev };
        next[address] = { ...next[address] };
        if (input.balance) next[address].balance = input.balance;
        if (input.matteredChainBalances)
          next[address].matteredChainBalances = input.matteredChainBalances;
        if (input.chainBalancesWithValue)
          next[address].chainBalancesWithValue = input.chainBalancesWithValue;
        if (input.originalCurveData) {
          next[address].originalCurveData = input.originalCurveData;
          // next[address].curveChartData = formChartData(
          //   input.originalCurveData,
          //   input.balance || 0,
          //   new Date().getTime()
          // );
        }

        return cacheHomeBalanceView(next);
      });
    },
    []
  );

  const deleteHomeBalanceByAddress = useCallback((address: string) => {
    setAddressBalanceMap((prev) => {
      const next = { ...prev };
      delete next[address];
      return cacheHomeBalanceView(next);
    });
  }, []);

  //   useEffect(() => {
  //     if (prevAddress && currentAddress !== prevAddress) {
  //       deleteHomeBalanceByAddress(prevAddress);
  //     }
  //   }, [prevAddress, currentAddress]);

  const currentHomeBalanceCache = !currentAddress
    ? null
    : addressBalanceMap[currentAddress ?? ''];

  // useEffect(() => {
  //   if (!currentAddress) return;

  //   const handler = async (ret) => {
  //     if (!isSameAddress(currentAddress, ret.accountToRefresh)) return;

  //     deleteHomeBalanceByAddress(ret.accountToRefresh);
  //   };
  //   eventBus.addEventListener(EVENTS.FORCE_EXPIRE_ADDRESS_BALANCE, handler);

  //   return () => {
  //     eventBus.removeEventListener(EVENTS.FORCE_EXPIRE_ADDRESS_BALANCE, handler);
  //   };
  // }, [currentAddress, deleteHomeBalanceByAddress]);

  return {
    currentHomeBalanceCache: currentHomeBalanceCache?.balance
      ? currentHomeBalanceCache
      : null,
    cacheHomeBalanceByAddress,
    deleteHomeBalanceByAddress,
  };
}

type ExpirationInfo = { balanceExpired: boolean; curveExpired: boolean };
export function useRefreshHomeBalanceView(options: {
  currentAddress?: string;
  refreshBalance: () => Promise<any>;
  refreshCurve: () => Promise<any>;
  isExpired: () => Promise<ExpirationInfo>;
}) {
  const { refreshBalance, refreshCurve, isExpired } = options;
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  const isRefreshingRef = useRef(false);
  const onRefresh = useCallback(
    async (ctx: Partial<ExpirationInfo> & { isManual?: boolean }) => {
      const {
        isManual = false,
        balanceExpired = true,
        curveExpired = true,
      } = ctx;

      isManual && setIsManualRefreshing(true);

      if (isRefreshingRef.current) return;

      const needRequest = balanceExpired || curveExpired;
      isRefreshingRef.current = needRequest;

      if (needRequest) {
        try {
          await Promise.all(
            [
              balanceExpired && refreshBalance(),
              curveExpired && refreshCurve(),
              !isManual && sleep(1000),
            ].filter(Boolean)
          );
        } catch (e) {
          console.error(e);
        }
      }

      isRefreshingRef.current = false;
      setIsManualRefreshing(false);
    },
    [refreshBalance, refreshCurve]
  );

  // useInterval(async () => {
  //   const expiration = await isExpired();
  //   onRefresh(expiration);
  // }, BALANCE_LOADING_TIMES.CHECK_INTERVAL);

  return {
    onRefresh,
    isManualRefreshing,
  };
}
