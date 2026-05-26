import { useMemo } from 'react';
import {
  OpenOrder,
  Leverage,
  AssetPosition,
} from '@rabby-wallet/hyperliquid-sdk';
import { useRabbySelector } from '@/ui/store';
import { isLimitOrder, computeMarginUsage } from '../limitOrderUtils';
import { useActiveAssetDataMap } from './useActiveAssetDataCache';

export interface LimitOrderRow {
  order: OpenOrder;
  leverage: Leverage | null;
  marginUsage: number;
}

const toRows = (
  orders: OpenOrder[],
  getLeverage: (coin: string) => Leverage | null
): LimitOrderRow[] =>
  orders
    .map((order) => {
      const leverage = getLeverage(order.coin);
      const marginUsage = leverage
        ? computeMarginUsage(
            order.limitPx,
            String(order.origSz),
            leverage.value
          )
        : 0;
      return { order, leverage, marginUsage };
    })
    .sort((a, b) => b.marginUsage - a.marginUsage);

/**
 * 首页限价单列表。有持仓的币种取持仓杠杆（store 里已有，免费）；
 * 仅有挂单的币种通过 REST getActiveAssetData（带缓存）补杠杆。
 */
export const useHomeLimitOrders = (
  positionAndOpenOrders: AssetPosition[]
): LimitOrderRow[] => {
  const openOrders = useRabbySelector((s) => s.perps.openOrders);
  const currentPerpsAccount = useRabbySelector(
    (s) => s.perps.currentPerpsAccount
  );

  const limitOrders = useMemo(() => openOrders.filter(isLimitOrder), [
    openOrders,
  ]);

  const posLeverageMap = useMemo(() => {
    const m: Record<string, Leverage> = {};
    positionAndOpenOrders?.forEach((p) => {
      m[p.position.coin] = p.position.leverage;
    });
    return m;
  }, [positionAndOpenOrders]);

  const coinsNeedFetch = useMemo(
    () =>
      Array.from(
        new Set(
          limitOrders.map((o) => o.coin).filter((c) => !posLeverageMap[c])
        )
      ),
    [limitOrders, posLeverageMap]
  );

  const fetchedMap = useActiveAssetDataMap(
    coinsNeedFetch,
    currentPerpsAccount?.address
  );

  return useMemo(
    () =>
      toRows(
        limitOrders,
        (coin) => posLeverageMap[coin] ?? fetchedMap[coin] ?? null
      ),
    [limitOrders, posLeverageMap, fetchedMap]
  );
};

/**
 * 币对详情页限价单列表。杠杆由调用方从 WS activeAssetData 直接传入。
 */
export const useDetailLimitOrders = (
  coin: string,
  leverage: Leverage | null
): LimitOrderRow[] => {
  const openOrders = useRabbySelector((s) => s.perps.openOrders);
  return useMemo(
    () =>
      toRows(
        openOrders.filter((o) => isLimitOrder(o) && o.coin === coin),
        () => leverage
      ),
    [openOrders, coin, leverage]
  );
};
