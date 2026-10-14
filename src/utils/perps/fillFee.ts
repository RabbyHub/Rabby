import BigNumber from 'bignumber.js';
import type { WsFill } from '@rabby-wallet/hyperliquid-sdk';

type FillFee = Pick<WsFill, 'px' | 'sz' | 'fee' | 'builderFee'>;

/** Fee amounts and px * abs(sz) are in the fill's quote currency.
 * Aggregated fills carry summed fees and size with a weighted average price.
 * Older records may omit builderFee; retain the existing 0.04% display then.
 */
export const getFillFeeRates = (fill?: FillFee | null) => {
  const unknown = { builder: '-', exchange: '-' };
  if (!fill) return unknown;
  const parse = (value?: string) =>
    typeof value === 'string' && value.trim()
      ? new BigNumber(value)
      : new BigNumber(NaN);
  if (fill.builderFee == null || !fill.builderFee.trim()) {
    return { builder: '0.04%', exchange: '-' };
  }
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
    return unknown;
  }
  const percent = (amount: BigNumber) =>
    `${amount.div(notional).times(100).decimalPlaces(8).toFixed()}%`;
  const total = parse(fill.fee);
  return {
    builder: percent(builder),
    exchange: total.isFinite() ? percent(total.minus(builder)) : '-',
  };
};
