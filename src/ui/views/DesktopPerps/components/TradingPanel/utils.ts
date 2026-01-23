import { formatUsdValue } from '@/ui/utils/number';
import { BigNumber } from 'bignumber.js';

export const calcAssetAmountByNotional = (
  notional: string | number,
  markPrice: string | number,
  szDecimals: number
) => {
  const amount = new BigNumber(notional)
    .div(new BigNumber(markPrice))
    .toFixed(szDecimals);
  return amount;
};

export const calcAssetNotionalByAmount = (
  amount: string | number,
  markPrice: string | number
) => {
  const notional = new BigNumber(amount)
    .multipliedBy(new BigNumber(markPrice))
    .toFixed(2, BigNumber.ROUND_DOWN);
  return notional;
};

export const calculateTargetPrice = (
  pnL: number,
  direction: 'Long' | 'Short',
  size: number,
  markPrice: number
) => {
  const priceDiff = pnL / size;
  return direction === 'Long' ? markPrice + priceDiff : markPrice - priceDiff;
};

export const formatPnL = (pnL: number) => {
  return pnL >= 0 ? `+${formatUsdValue(pnL)}` : formatUsdValue(pnL);
};

export const calculatePnL = (
  targetPrice: number,
  direction: 'Long' | 'Short',
  size: number,
  markPrice: number
) => {
  const priceDiff =
    direction === 'Long' ? targetPrice - markPrice : markPrice - targetPrice;
  return priceDiff * size;
};

export function removeTrailingZeros(value: string): string {
  if (!value.includes('.')) return value;

  const normalized = value.replace(/\.?0+$/, '');
  if (normalized === '-0') return '0';
  return normalized;
}

/**
 * Validate amount input based on szDecimals
 * According to Hyperliquid docs: szDecimals determines the lot size precision
 * https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/tick-and-lot-size
 *
 * @param value - The input value to validate
 * @param szDecimals - The size decimals for the asset
 * @returns true if the input is valid, false otherwise
 */
export const validateAmountInput = (
  value: string,
  szDecimals: number
): boolean => {
  // Allow empty string
  if (value === '') return true;

  // Allow single decimal point at the end (user is typing)
  if (value === '.') return false;

  // Check if it's a valid number format
  if (!/^\d*\.?\d*$/.test(value)) return false;

  // If no decimal point, always valid
  if (!value.includes('.')) return true;

  // If ends with decimal point, allow it (user is typing)
  if (value.endsWith('.')) return true;

  // Check decimal places don't exceed szDecimals
  const [, decimalPart] = value.split('.');
  if (decimalPart && decimalPart.length > szDecimals) {
    return false;
  }

  return true;
};

/**
 * Format amount to correct precision based on szDecimals
 * According to Hyperliquid docs: szDecimals determines the lot size precision
 *
 * @param value - The value to format
 * @param szDecimals - The size decimals for the asset
 * @returns Formatted amount string
 */
export const formatAmount = (
  value: string | number,
  szDecimals: number
): string => {
  if (value === '' || value === undefined || value === null) return '';

  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num) || num === 0) return '';

  // Round down to szDecimals precision
  const formatted = new BigNumber(num).toFixed(
    szDecimals,
    BigNumber.ROUND_DOWN
  );

  // Remove trailing zeros
  return removeTrailingZeros(formatted);
};

/**
 * Validate notional (USD value) input
 * Notional values are typically limited to 2 decimal places
 *
 * @param value - The input value to validate
 * @returns true if the input is valid, false otherwise
 */
export const validateNotionalInput = (value: string): boolean => {
  // Allow empty string
  if (value === '') return true;

  // Check if it's a valid number format
  if (!/^\d*\.?\d*$/.test(value)) return false;

  // If no decimal point, always valid
  if (!value.includes('.')) return true;

  // If ends with decimal point, allow it (user is typing)
  if (value.endsWith('.')) return true;

  // Check decimal places don't exceed 2
  const [, decimalPart] = value.split('.');
  if (decimalPart && decimalPart.length > 2) {
    return false;
  }

  return true;
};

/**
 * Format notional to 2 decimal places
 *
 * @param value - The value to format
 * @returns Formatted notional string
 */
export const formatNotional = (value: string | number): string => {
  if (value === '' || value === undefined || value === null) return '';

  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num) || num === 0) return '';

  // Round down to 2 decimal places
  const formatted = new BigNumber(num).toFixed(2, BigNumber.ROUND_DOWN);

  // Remove trailing zeros
  return removeTrailingZeros(formatted);
};

/**
 * Calculate maximum totalSize for scale orders based on available balance and leverage
 * @param availableBalance - Available balance in USD
 * @param leverage - Leverage value
 * @param startPrice - Start price for scale orders
 * @param endPrice - End price for scale orders
 * @param numGrids - Number of grid orders
 * @param sizeSkew - Size skew factor (1.0 = equal distribution)
 * @param szDecimals - Size decimals for rounding
 * @returns Maximum totalSize that can be used without exceeding available balance
 */
export const calculateMaxScaleTotalSize = (
  availableBalance: number,
  leverage: number,
  startPrice: string,
  endPrice: string,
  numGrids: number,
  sizeSkew: number,
  szDecimals: number
): string => {
  if (
    !availableBalance ||
    !leverage ||
    !startPrice ||
    !endPrice ||
    numGrids <= 0 ||
    sizeSkew <= 0
  ) {
    return '0';
  }

  const startPriceBN = new BigNumber(startPrice);
  const endPriceBN = new BigNumber(endPrice);
  const numGridsBN = new BigNumber(numGrids);
  const sizeSkewBN = new BigNumber(sizeSkew);
  const availableBalanceBN = new BigNumber(availableBalance);
  const leverageBN = new BigNumber(leverage);

  // Calculate price range and step
  const priceRange = endPriceBN.minus(startPriceBN);
  const priceStep = priceRange.dividedBy(numGridsBN.minus(1));

  // Calculate firstSize and commonSizeDiff coefficients (without totalSize)
  let firstSizeCoeff: BigNumber;
  let commonSizeDiffCoeff: BigNumber;

  if (sizeSkewBN.isEqualTo(1)) {
    // Equal distribution: firstSize = totalSize / numGrids
    firstSizeCoeff = new BigNumber(1).dividedBy(numGridsBN);
    commonSizeDiffCoeff = new BigNumber(0);
  } else {
    // Skewed distribution
    // firstSize = totalSize / [numGrids * (1 + (sizeSkew - 1) / 2)]
    const denominator = numGridsBN.multipliedBy(
      new BigNumber(1).plus(sizeSkewBN.minus(1).dividedBy(2))
    );
    firstSizeCoeff = new BigNumber(1).dividedBy(denominator);

    // commonSizeDiff = (sizeSkew - 1) * firstSize / (numGrids - 1)
    // Since firstSize = totalSize * firstSizeCoeff, we can express commonSizeDiff in terms of totalSize
    commonSizeDiffCoeff = sizeSkewBN
      .minus(1)
      .multipliedBy(firstSizeCoeff)
      .dividedBy(numGridsBN.minus(1));
  }

  // Calculate total margin required per unit of totalSize
  // For each order i: margin_i = (size_i * price_i) / leverage
  // Total margin = Σ(margin_i) = (1/leverage) * Σ(size_i * price_i)
  let totalMarginPerUnitTotalSize = new BigNumber(0);

  for (let i = 0; i < numGrids; i++) {
    const iBN = new BigNumber(i);

    // Price for order i: price_i = startPrice + i * priceStep
    const price = startPriceBN.plus(iBN.multipliedBy(priceStep));

    // Size for order i: size_i = firstSize + i * commonSizeDiff
    // size_i = totalSize * (firstSizeCoeff + i * commonSizeDiffCoeff)
    const sizeCoeff = firstSizeCoeff.plus(
      iBN.multipliedBy(commonSizeDiffCoeff)
    );

    // Margin for order i per unit totalSize: margin_i = sizeCoeff * price / leverage
    const marginPerUnit = sizeCoeff.multipliedBy(price).dividedBy(leverageBN);

    totalMarginPerUnitTotalSize = totalMarginPerUnitTotalSize.plus(
      marginPerUnit
    );
  }

  // Calculate maximum totalSize: totalSize = availableBalance / totalMarginPerUnitTotalSize
  if (totalMarginPerUnitTotalSize.isZero()) {
    return '0';
  }

  const maxTotalSize = availableBalanceBN
    .dividedBy(totalMarginPerUnitTotalSize)
    .toFixed(szDecimals, BigNumber.ROUND_DOWN);

  return maxTotalSize;
};
