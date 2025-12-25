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
