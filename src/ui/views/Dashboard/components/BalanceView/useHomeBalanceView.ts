import { useCallback, useEffect, useState } from 'react';
import type { CurveData } from './useCurve';
import { usePrevious } from 'react-use';

const HomeBalanceViewCacheKey = 'HomeBalanceViewCacheKey';
type AddressCacheItem = {
  balance: number | null;
  curveData: CurveData;
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

  const prevAddress = usePrevious(currentAddress);

  const cacheHomeBalanceByAddress = useCallback(
    (address: string, input: Partial<AddressCacheItem>) => {
      setAddressBalanceMap((prev) => {
        const next = { ...prev };
        next[address] = { ...next[address] };
        if (input.balance) next[address].balance = input.balance;
        if (input.curveData) next[address].curveData = input.curveData;

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

  //   console.log('[feat] addressBalanceMap', addressBalanceMap);

  return {
    currentHomeBalanceCache:
      (!currentAddress ? null : addressBalanceMap[currentAddress ?? '']) ||
      null,
    cacheHomeBalanceByAddress,
    deleteHomeBalanceByAddress,
  };
}
