import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  UserHistoricalOrders,
  WsFill,
} from '@rabby-wallet/hyperliquid-sdk';

import { getPerpsSDK } from '@/ui/views/Perps/sdkManager';

import type { SpotMarket } from '../utils/spotMarkets';
import { buildSpotOrderHistoryItems } from '../utils/spotOrderHistory';

type HistorySnapshot = {
  address: string;
  history: UserHistoricalOrders[];
  fills: WsFill[];
  loadedAt: number;
};

// Both endpoints return up to 2000 rows; reopening the tab within this window reuses
// the snapshot, the refresh button always reloads.
const HISTORY_FRESH_MS = 60_000;

/**
 * Closed spot orders, fetched once when `enabled` turns on and on `reload`.
 * Not polled: both endpoints return up to 2000 rows for the whole account.
 */
export const useSpotOrderHistory = ({
  address,
  markets,
  enabled,
}: {
  address: string | undefined;
  markets: SpotMarket[];
  enabled: boolean;
}) => {
  const [snapshot, setSnapshot] = useState<HistorySnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const requestIdRef = useRef(0);

  const reload = useCallback(async () => {
    if (!address) {
      return;
    }
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setIsError(false);
    try {
      const sdk = getPerpsSDK();
      const [history, fills] = await Promise.all([
        sdk.info.getUserHistoricalOrders(address),
        // Fills only add the average price; the list still works without.
        sdk.info.getUserFills(address).catch(() => [] as WsFill[]),
      ]);
      if (requestId === requestIdRef.current) {
        setSnapshot({
          address,
          history: history ?? [],
          fills: fills ?? [],
          loadedAt: Date.now(),
        });
      }
    } catch (error) {
      console.error('[perpsSpot] order history fetch failed', error);
      if (requestId === requestIdRef.current) {
        setIsError(true);
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [address]);

  const current = snapshot && snapshot.address === address ? snapshot : null;
  const currentRef = useRef(current);
  currentRef.current = current;

  useEffect(() => {
    const existing = currentRef.current;
    if (
      enabled &&
      (!existing || Date.now() - existing.loadedAt > HISTORY_FRESH_MS)
    ) {
      reload();
    }
  }, [enabled, reload]);

  const items = useMemo(
    () =>
      current
        ? buildSpotOrderHistoryItems(current.history, current.fills, markets)
        : [],
    [current, markets]
  );

  return {
    items,
    isLoading: isLoading && !current,
    isRefreshing: isLoading && !!current,
    isError: isError && !current,
    reload,
  };
};
