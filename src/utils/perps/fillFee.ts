import BigNumber from 'bignumber.js';
import type { WsFill } from '@rabby-wallet/hyperliquid-sdk';

type FillFee = Pick<WsFill, 'px' | 'sz' | 'builderFee'>;

/** Match the recorded Rabby rate after rounding to two percentage decimals.
 * Server-aggregated records are consumed as supplied; no client aggregation.
 * Missing, invalid, zero or non-Rabby rates retain the 0.04% display fallback.
 */
export const getRabbyFillFeeRate = (fill?: FillFee | null): string => {
  const fallback = '0.04%';
  if (!fill) return fallback;
  const parse = (value?: string) =>
    typeof value === 'string' && value.trim()
      ? new BigNumber(value)
      : new BigNumber(NaN);
  const price = parse(fill.px);
  const size = parse(fill.sz).abs();
  const builder = parse(fill.builderFee);
  const notional = price.times(size);
  if (
    !price.isFinite() ||
    !price.isGreaterThan(0) ||
    !notional.isFinite() ||
    !notional.isGreaterThan(0) ||
    !builder.isFinite() ||
    builder.isNegative()
  ) {
    return fallback;
  }
  const display = `${builder
    .div(notional)
    .times(100)
    .toFixed(2, BigNumber.ROUND_HALF_UP)}%`;
  // No nearest-tier inference: whitelist only the rounded display value.
  return display === '0.02%' || display === '0.04%' ? display : fallback;
};
