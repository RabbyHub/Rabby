import BigNumber from 'bignumber.js';
import { OpenOrder } from '@rabby-wallet/hyperliquid-sdk';

/** Excludes trigger orders and position-attached TP/SL. */
export const isLimitOrder = (order: OpenOrder): boolean =>
  !order.isTrigger && !order.isPositionTpsl && order.orderType === 'Limit';

export const computeFilledPct = (origSz: string, sz: string): number => {
  const orig = new BigNumber(origSz || 0);
  if (orig.isZero()) return 0;
  return orig
    .minus(sz || 0)
    .div(orig)
    .times(100)
    .toNumber();
};

export const computeMarginUsage = (
  limitPx: string,
  origSz: string,
  leverage: number
): number => {
  if (!leverage || leverage <= 0) return 0;
  return new BigNumber(limitPx || 0)
    .times(origSz || 0)
    .div(leverage)
    .toNumber();
};

/** Returns Infinity on bad input so callers trip the block threshold. */
export const computeLimitPriceDeviation = (
  limitPx: string,
  markPx: number
): number => {
  const limit = Number(limitPx);
  if (!Number.isFinite(limit) || !markPx || markPx <= 0) {
    return Infinity;
  }
  return Math.abs(limit - markPx) / markPx;
};

/** Buy with limit >= mark or sell with limit <= mark — would cross the book immediately. */
export const isMarketableLimit = (params: {
  direction: 'Long' | 'Short';
  limitPx: string;
  markPx: number;
}): boolean => {
  const limit = Number(params.limitPx);
  if (!Number.isFinite(limit) || limit <= 0) {
    return false;
  }
  return params.direction === 'Long'
    ? limit >= params.markPx
    : limit <= params.markPx;
};
