import BigNumber from 'bignumber.js';
import { OpenOrder } from '@rabby-wallet/hyperliquid-sdk';

/**
 * 静态挂出的限价开/平仓单 —— 排除触发单（止盈/止损）与持仓绑定的 TP/SL。
 */
export const isLimitOrder = (order: OpenOrder): boolean =>
  !order.isTrigger && !order.isPositionTpsl && order.orderType === 'Limit';

/** 成交百分比：(origSz - sz) / origSz * 100。sz 为剩余未成交数量。 */
export const computeFilledPct = (origSz: string, sz: string): number => {
  const orig = new BigNumber(origSz || 0);
  if (orig.isZero()) return 0;
  return orig
    .minus(sz || 0)
    .div(orig)
    .times(100)
    .toNumber();
};

/** 保证金占用（USDC）：limitPx * origSz / leverage。 */
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

/** 限价相对标记价的偏离比例（绝对值）。非法输入返回 Infinity 以触发阻断。 */
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

/**
 * 判断该限价单是否会立即穿越盘口成交（即等效于市价单）：
 * 买单限价 >= 标记价、卖单限价 <= 标记价。
 */
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
