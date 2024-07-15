/* eslint "react-hooks/exhaustive-deps": ["error"] */
/* eslint-enable react-hooks/exhaustive-deps */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DisplayChainWithWhiteLogo } from '@/utils/chain';
import { sleep } from '@/ui/utils';
import { CurvePointCollection } from '@/background/service/preference';
import { useRabbyDispatch, useRabbyGetter } from '@/ui/store';
import { formChartData } from './useCurve';
import { normalizeAndVaryChainList, normalizeChainList } from '@/utils/account';
import { useRefState } from '@/ui/hooks/useRefState';
import { usePrevious } from 'react-use';

/** @deprecated */
const HomeBalanceViewCacheKey = 'HomeBalanceViewCacheKey';
if (localStorage.getItem(HomeBalanceViewCacheKey)) {
  localStorage.removeItem(HomeBalanceViewCacheKey);
}

export function useHomeBalanceViewOuterPrefetch(
  currentAddress?: string | null
) {
  const dispatch = useRabbyDispatch();

  const {
    state: dashboardBalanceCacheInited,
    stateRef: dashboardBalanceCacheInitedRef,
    setRefState: setDashboardBalanceCacheInitedRef,
  } = useRefState(false);
  const prevAddress = usePrevious(currentAddress);

  useEffect(() => {
    if (!currentAddress) return;
    if (prevAddress === currentAddress) return;

    setDashboardBalanceCacheInitedRef(false);
  }, [prevAddress, currentAddress, setDashboardBalanceCacheInitedRef]);

  useEffect(() => {
    if (!currentAddress) return;
    if (dashboardBalanceCacheInitedRef.current) return;

    Promise.allSettled([
      dispatch.account.getPersistedBalanceAboutCacheAsync(currentAddress),
      sleep(50),
    ]).finally(() => {
      setDashboardBalanceCacheInitedRef(true);
    });
  }, [
    dispatch,
    currentAddress,
    dashboardBalanceCacheInitedRef,
    setDashboardBalanceCacheInitedRef,
  ]);

  return {
    dashboardBalanceCacheInited,
  };
}

export function useHomeBalanceView(currentAddress?: string | undefined) {
  const cacheAboutData = useRabbyGetter(
    (s) => s.account.currentBalanceAboutMap
  );

  const currentHomeBalanceCache = useMemo(() => {
    const { balanceMap, curvePointsMap } = cacheAboutData;
    const totalBalance = balanceMap[currentAddress || ''];
    const curvePoints = curvePointsMap[currentAddress || ''];

    if (!totalBalance || !curvePoints) return null;

    const balanceValue = totalBalance?.total_usd_value || 0;

    const { chainList, chainListWithValue } = normalizeAndVaryChainList(
      totalBalance?.chain_list || []
    );

    return {
      balance: balanceValue,
      originalCurveData: curvePoints || [],
      curveChartData: formChartData(
        curvePoints || [],
        balanceValue,
        Date.now()
      ),
      matteredChainBalances: chainList,
      chainBalancesWithValue: chainListWithValue || [],
    };
  }, [currentAddress, cacheAboutData]);

  const deleteHomeBalanceByAddress = useCallback((address: string) => {}, []);

  return {
    currentHomeBalanceCache: currentHomeBalanceCache?.balance
      ? currentHomeBalanceCache
      : null,
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
  // }, BALANCE_LOADING_CONFS.CHECK_INTERVAL);

  return {
    onRefresh,
    isManualRefreshing,
  };
}
