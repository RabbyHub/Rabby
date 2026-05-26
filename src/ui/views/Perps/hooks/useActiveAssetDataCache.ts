import { useEffect, useState } from 'react';
import { Leverage } from '@rabby-wallet/hyperliquid-sdk';
import { getPerpsSDK } from '../sdkManager';

interface CacheEntry {
  leverage: Leverage;
  ts: number;
}

const TTL = 10 * 60 * 1000; // 10 分钟
const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<Leverage | null>>();

const cacheKey = (coin: string, address: string) =>
  `${address.toLowerCase()}::${coin}`;

/** 供详情页 WS 订阅回种缓存，让首页复用、省一次 REST。 */
export const writeLeverageToCache = (
  coin: string,
  address: string,
  leverage: Leverage
) => {
  cache.set(cacheKey(coin, address), { leverage, ts: Date.now() });
};

/** 缓存优先；未命中或过期则 REST 拉取；并发同 key 去重；失败回退陈旧值。 */
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
      return hit?.leverage ?? null; // 回退陈旧值，好于直接 null
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, task);
  return task;
};

/**
 * 批量拿币种杠杆。币种列表变化时并行拉取；拉取期间账号切换则丢弃结果。
 */
export const useActiveAssetDataMap = (
  coins: string[],
  address?: string
): Record<string, Leverage> => {
  const [map, setMap] = useState<Record<string, Leverage>>({});
  const key = coins.join('|'); // 内容相等的数组不重复拉取

  useEffect(() => {
    if (!address || coins.length === 0) {
      setMap({});
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
      if (cancelled) return; // 账号/币种已变，丢弃
      const next: Record<string, Leverage> = {};
      entries.forEach(([coin, leverage]) => {
        if (leverage) next[coin] = leverage;
      });
      setMap(next);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, address]);

  return map;
};
