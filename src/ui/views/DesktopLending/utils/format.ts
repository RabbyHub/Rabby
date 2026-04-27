import BigNumber from 'bignumber.js';

import {
  formatAmount as baseFormatAmount,
  formatLittleNumber,
  formatUsdValue as baseFormatUsdValue,
} from '@/ui/utils/number';

const KMB_FORMAT: BigNumber.Format = {
  decimalSeparator: '.',
  groupSeparator: ',',
  groupSize: 3,
};

const formatKmbAmount = (
  value: BigNumber,
  roundingMode: BigNumber.RoundingMode
) => {
  const absValue = value.absoluteValue();
  const sign = value.lt(0) ? '-' : '';

  if (absValue.gte(1e9)) {
    return `${sign}${absValue.div(1e9).toFormat(2, roundingMode, KMB_FORMAT)}B`;
  }

  if (absValue.gte(1e6)) {
    return `${sign}${absValue.div(1e6).toFormat(2, roundingMode, KMB_FORMAT)}M`;
  }

  return `${sign}${absValue.div(1e3).toFormat(2, roundingMode, KMB_FORMAT)}K`;
};

const formatSmallAmount = (value: BigNumber) => {
  const sign = value.lt(0) ? '-' : '';
  return `${sign}${formatLittleNumber(value.absoluteValue().toFixed())}`;
};

export const formatAmount = (
  amount: string | number,
  decimals = 4,
  roundingMode = BigNumber.ROUND_HALF_UP as BigNumber.RoundingMode
) => {
  const bnValue = new BigNumber(amount);

  if (bnValue.isNaN()) {
    return amount.toString();
  }

  if (bnValue.absoluteValue().gte(1000)) {
    return formatKmbAmount(bnValue, roundingMode);
  }

  if (bnValue.absoluteValue().lt(0.0001) && !bnValue.eq(0)) {
    return formatSmallAmount(bnValue);
  }

  return baseFormatAmount(amount, decimals);
};

export const formatUsdValue = (
  value: string | number,
  roundingMode = BigNumber.ROUND_HALF_UP as BigNumber.RoundingMode
) => {
  const bnValue = new BigNumber(value);

  if (bnValue.isNaN()) {
    return baseFormatUsdValue(value, roundingMode);
  }

  if (bnValue.absoluteValue().gte(1000)) {
    const sign = bnValue.lt(0) ? '-' : '';
    return `${sign}$${formatKmbAmount(bnValue.absoluteValue(), roundingMode)}`;
  }

  if (bnValue.absoluteValue().lt(0.0001) && !bnValue.eq(0)) {
    const sign = bnValue.lt(0) ? '-' : '';
    return `${sign}$${formatSmallAmount(bnValue.absoluteValue())}`;
  }

  return baseFormatUsdValue(value, roundingMode);
};

export const estDaily = (netWorth: string, netApy: number) => {
  if (!netWorth || !netApy) {
    return '$0.00';
  }
  const dailyEarnings = new BigNumber(netWorth);
  const bigApy = new BigNumber(netApy);
  return `${netApy > 0 ? '+' : '-'}${formatUsdValue(
    Math.abs(dailyEarnings.multipliedBy(bigApy).dividedBy(365).toNumber())
  )}`;
};
export const formatListNetWorth = (num?: number) => {
  if (!num && num !== 0) {
    return '';
  }
  return formatUsdValue(num);
};

export const formatPercent = (value: number) => {
  const percentNumber = value * 100;
  const decimalsNumber = Math.min(
    String(percentNumber).split('.')[1]?.length || 0,
    2
  );
  return `${percentNumber.toFixed(decimalsNumber)}%`;
};

export const formatApy = (apy: number) => {
  if (!apy) {
    return '0%';
  }
  if (apy < 0.0001) {
    return '<0.01%';
  }
  return formatPercent(apy);
};

export const EXTRACT_AMOUNT_REGEX = /^[0-9]+(\.|,)\d*/;
export function formatSpeicalAmount(input: number | string) {
  const inputStr = String(input);

  const matched = inputStr.match(EXTRACT_AMOUNT_REGEX);

  const firstSep = matched?.[1];
  if (firstSep && firstSep !== '.') {
    return inputStr.replace(new RegExp(firstSep), '.');
  }

  return input.toString();
}
