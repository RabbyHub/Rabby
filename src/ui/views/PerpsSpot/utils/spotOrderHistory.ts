import type {
  UserHistoricalOrders,
  WsFill,
} from '@rabby-wallet/hyperliquid-sdk';
import BigNumber from 'bignumber.js';

import type { SpotMarket } from './spotMarkets';

// Hyperliquid's historicalOrders endpoint returns the latest 2000 orders
// (perps and spot); the list keeps the most recent spot ones.
export const SPOT_ORDER_HISTORY_LIMIT = 200;

export type SpotOrderHistoryStatus = 'filled' | 'canceled' | 'rejected';

export type SpotOrderHistoryItem = {
  oid: number;
  market: SpotMarket;
  side: 'B' | 'A';
  status: SpotOrderHistoryStatus;
  origSz: string;
  filledSz: string;
  limitPx: string;
  /** Volume-weighted fill price, when the fills are still in the fill feed. */
  avgPx: string | null;
  time: number;
};

/** Collapse Hyperliquid's lifecycle statuses; open/triggered return null. */
export const getSpotOrderHistoryStatus = (
  status: string
): SpotOrderHistoryStatus | null => {
  if (status === 'filled') {
    return 'filled';
  }
  if (status === 'canceled' || status.endsWith('Canceled')) {
    return 'canceled';
  }
  if (status === 'rejected' || status.endsWith('Rejected')) {
    return 'rejected';
  }
  return null;
};

const buildAvgPxByOid = (fills: WsFill[] | null | undefined) => {
  const totals = new Map<number, { notional: BigNumber; size: BigNumber }>();
  for (const fill of fills ?? []) {
    const size = new BigNumber(fill.sz);
    const px = new BigNumber(fill.px);
    if (!size.isFinite() || !px.isFinite() || size.lte(0)) {
      continue;
    }
    const prev = totals.get(fill.oid);
    totals.set(fill.oid, {
      notional: (prev?.notional ?? new BigNumber(0)).plus(px.times(size)),
      size: (prev?.size ?? new BigNumber(0)).plus(size),
    });
  }
  return totals;
};

/**
 * Closed spot orders (filled, canceled, rejected) newest first. Orders on
 * pairs missing from the market list are dropped, as are perp orders.
 */
export const buildSpotOrderHistoryItems = (
  history: UserHistoricalOrders[] | null | undefined,
  fills: WsFill[] | null | undefined,
  markets: SpotMarket[],
  limit = SPOT_ORDER_HISTORY_LIMIT
): SpotOrderHistoryItem[] => {
  if (!history?.length) {
    return [];
  }
  const marketsByCoin = new Map(markets.map((market) => [market.coin, market]));
  const avgPxByOid = buildAvgPxByOid(fills);
  const items: SpotOrderHistoryItem[] = [];
  for (const entry of history) {
    const market = marketsByCoin.get(entry.order?.coin);
    const status = getSpotOrderHistoryStatus(entry.status ?? '');
    if (!market || !status) {
      continue;
    }
    const { order } = entry;
    const filled = new BigNumber(order.origSz || 0).minus(order.sz || 0);
    const fillTotals = avgPxByOid.get(order.oid);
    items.push({
      oid: order.oid,
      market,
      side: order.side === 'B' ? 'B' : 'A',
      status,
      origSz: order.origSz,
      filledSz: filled.gt(0) ? filled.toFixed() : '0',
      limitPx: order.limitPx,
      avgPx: fillTotals
        ? fillTotals.notional.div(fillTotals.size).toFixed()
        : null,
      time: entry.statusTimestamp || order.timestamp,
    });
  }
  return items.sort((a, b) => b.time - a.time).slice(0, limit);
};
