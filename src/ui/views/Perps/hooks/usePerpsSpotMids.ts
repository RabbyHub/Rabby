import { useEffect, useState } from 'react';
import { getPerpsSDK } from '../sdkManager';

let _midsCache: { time: number; data: Record<string, string> } | null = null;
const CACHE_TTL_MS = 30_000;

export const fetchPerpsSpotMids = async (): Promise<Record<string, string>> => {
  const now = Date.now();
  if (_midsCache && now - _midsCache.time < CACHE_TTL_MS) {
    return _midsCache.data;
  }
  try {
    const sdk = getPerpsSDK();
    const mids = await sdk.info.getAllMids();
    _midsCache = { time: now, data: (mids as any) || {} };
    return _midsCache.data;
  } catch (e) {
    console.error('fetchPerpsSpotMids failed', e);
    return _midsCache?.data || {};
  }
};

export const usePerpsSpotMids = (active: boolean) => {
  const [mids, setMids] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!active) return;
    let alive = true;
    fetchPerpsSpotMids().then((m) => {
      if (alive) setMids(m);
    });
    return () => {
      alive = false;
    };
  }, [active]);
  return mids;
};
