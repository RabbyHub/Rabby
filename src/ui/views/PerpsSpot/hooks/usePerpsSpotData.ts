import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  OpenOrder,
  SpotAssetCtx,
  SpotClearinghouseState,
  SpotMeta,
} from '@rabby-wallet/hyperliquid-sdk';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { getPerpsSDK } from '@/ui/views/Perps/sdkManager';
import { buildSpotMarkets, isSpotOpenOrder } from '../utils/spotMarkets';

const POLL_INTERVAL_MS = 4000;

type SpotAccountSnapshot = {
  address: string;
  balances: SpotClearinghouseState['balances'];
  openOrders: OpenOrder[];
};

type SpotMarketSnapshot = {
  meta: SpotMeta;
  ctxs: SpotAssetCtx[];
};

/**
 * Spot pair contexts (mid, 24h change, volume) and optionally the account's
 * spot balances / open spot orders, polled over REST while the screen is
 * mounted and the page is visible. Spot screens are rarely open, so this
 * stays off the shared Perps WS store.
 */
export const usePerpsSpotData = ({ withAccount }: { withAccount: boolean }) => {
  const dispatch = useRabbyDispatch();
  const spotMeta = useRabbySelector((s) => s.perps.spotMeta);
  const currentPerpsAccount = useRabbySelector(
    (s) => s.perps.currentPerpsAccount
  );
  const address = currentPerpsAccount?.address;
  const [snapshot, setSnapshot] = useState<SpotMarketSnapshot | null>(null);
  const snapshotRef = useRef<SpotMarketSnapshot | null>(null);
  snapshotRef.current = snapshot;
  // When the pair contexts were last fetched; a failed poll keeps the old
  // prices, so order code must check freshness before pricing a market order.
  const [midsUpdatedAt, setMidsUpdatedAt] = useState(0);
  const [isError, setIsError] = useState(false);
  const [account, setAccount] = useState<SpotAccountSnapshot | null>(null);
  const inFlightRef = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlightRef.current) {
      return;
    }
    inFlightRef.current = true;
    try {
      const sdk = getPerpsSDK();
      const [metaAndCtxs, spotState, openOrders] = await Promise.all([
        sdk.info.getSpotMetaAndAssetCtxs().catch(() => null),
        withAccount && address
          ? sdk.info.getSpotClearingHouseState(address).catch(() => null)
          : null,
        withAccount && address
          ? sdk.info.getFrontendOpenOrders(address).catch(() => null)
          : null,
      ]);
      if (
        metaAndCtxs &&
        Array.isArray(metaAndCtxs[0]?.universe) &&
        Array.isArray(metaAndCtxs[1])
      ) {
        setSnapshot({ meta: metaAndCtxs[0], ctxs: metaAndCtxs[1] });
        setMidsUpdatedAt(Date.now());
        setIsError(false);
      } else if (!snapshotRef.current) {
        setIsError(true);
      }
      if (withAccount && address && (spotState || openOrders)) {
        setAccount((current) => {
          const prev = current?.address === address ? current : null;
          return {
            address,
            balances: spotState?.balances ?? prev?.balances ?? [],
            openOrders:
              openOrders?.filter(isSpotOpenOrder) ?? prev?.openOrders ?? [],
          };
        });
      }
    } finally {
      inFlightRef.current = false;
    }
  }, [address, withAccount]);

  useEffect(() => {
    // Cached meta lets the list render while the first poll is in flight;
    // once a snapshot exists the poll carries its own meta.
    if (!snapshotRef.current && !spotMeta) {
      dispatch.perps.fetchSpotMeta();
    }
    refresh();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        refresh();
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh]);

  const meta = snapshot?.meta ?? spotMeta;
  const ctxs = snapshot?.ctxs ?? null;
  const markets = useMemo(() => buildSpotMarkets(meta, null, ctxs), [
    meta,
    ctxs,
  ]);

  return {
    markets,
    midsUpdatedAt,
    isLoading: !meta || !ctxs,
    isError: isError && !ctxs,
    // Never surface a previous account's balances after an account switch.
    account: account && account.address === address ? account : null,
    currentPerpsAccount,
    refresh,
  };
};
