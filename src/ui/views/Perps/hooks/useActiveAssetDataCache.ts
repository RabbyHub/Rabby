import { useEffect, useState } from 'react';
import { Leverage } from '@rabby-wallet/hyperliquid-sdk';
import { getPerpsSDK } from '../sdkManager';

interface CacheEntry {
  leverage: Leverage;
  ts: number;
}

const TTL = 10 * 60 * 1000; // 10 min
const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<Leverage | null>>();

const cacheKey = (coin: string, address: string) =>
  `${address.toLowerCase()}::${coin}`;

/** Detail-page WS seeds this so home reads skip an extra REST. */
export const writeLeverageToCache = (
  coin: string,
  address: string,
  leverage: Leverage
) => {
  cache.set(cacheKey(coin, address), { leverage, ts: Date.now() });
};

export const fetchLeverageWithCache = async (
  coin: string,
  address: string
): Promise<Leverage | null> => {
  const key = cacheKey(coin, address);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < TTL) return hit.leverage;

  const existing = inflight.get(key);
  if (existing) return existing;

  const task = (async () => {
    try {
      const sdk = getPerpsSDK();
      const data = await sdk.info.getActiveAssetData(coin, address);
      const leverage = data?.leverage ?? null;
      if (leverage) cache.set(key, { leverage, ts: Date.now() });
      return leverage;
    } catch (e) {
      console.error('getActiveAssetData failed', coin, e);
      return hit?.leverage ?? null; // Stale beats null — null would zero out marginUsage.
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, task);
  return task;
};

export const useActiveAssetDataMap = (
  coins: string[],
  address?: string
): Record<string, Leverage> => {
  const [map, setMap] = useState<Record<string, Leverage>>({});
  // Sort so insertion-order differences (same set, different ordering) don't refetch.
  const key = [...coins].sort().join('|');

  useEffect(() => {
    if (!address || coins.length === 0) {
      setMap((prev) => (Object.keys(prev).length === 0 ? prev : {}));
      return;
    }
    let cancelled = false;
    const reqAddress = address;
    Promise.all(
      coins.map(async (coin) => {
        const leverage = await fetchLeverageWithCache(coin, reqAddress);
        return [coin, leverage] as const;
      })
    ).then((entries) => {
      if (cancelled) return; // Account/coins changed mid-flight.
      const next: Record<string, Leverage> = {};
      entries.forEach(([coin, leverage]) => {
        if (leverage) next[coin] = leverage;
      });
      setMap((prev) => {
        const prevKeys = Object.keys(prev);
        const nextKeys = Object.keys(next);
        if (
          prevKeys.length === nextKeys.length &&
          nextKeys.every((k) => prev[k] === next[k])
        ) {
          return prev;
        }
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, address]);

  return map;
};
