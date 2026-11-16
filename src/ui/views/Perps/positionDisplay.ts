import BigNumber from 'bignumber.js';

type PriceInput = string | number | null | undefined;

const finiteDecimal = (value: PriceInput): BigNumber | null => {
  if (value == null || (typeof value === 'string' && !value.trim())) {
    return null;
  }
  const number = new BigNumber(value);
  return number.isFinite() ? number : null;
};

/**
 * Signed gap from the mark price to liquidation, e.g. `-7.84%`.
 * A nonpositive liquidation price counts as zero; `--` when not computable.
 * Kept in a leaf module so jest can import it without the extension runtime.
 */
export const formatLiquidationGap = (
  liquidation: PriceInput,
  mark: PriceInput
): string => {
  const liq = finiteDecimal(liquidation);
  const price = finiteDecimal(mark);
  if (!liq || !price?.gt(0)) return '--';
  const gap = BigNumber.maximum(liq, 0)
    .minus(price)
    .div(price)
    .times(100)
    .decimalPlaces(2);
  if (gap.isZero()) return '0.00%';
  return `${gap.gt(0) ? '+' : ''}${gap.toFixed(2)}%`;
};

/** Close size and its notional; rounding mirrors the size SingleCoin submits. */
export const closeQuantitySummary = (
  size: string,
  percent: number,
  szDecimals: number,
  markPrice: number
) => {
  const quantity =
    percent === 100
      ? Number(size).toString()
      : ((Number(size) * percent) / 100).toFixed(szDecimals);
  return {
    quantity,
    notional: new BigNumber(quantity).times(markPrice).toFixed(2),
  };
};
