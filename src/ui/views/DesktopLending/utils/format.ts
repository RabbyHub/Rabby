import BigNumber from 'bignumber.js';

import { formatUsdValueKMB } from '../../Dashboard/components/TokenDetailPopup/utils';
import { formatUsdValue } from '@/ui/utils/number';

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
  if (num > 1000) {
    return formatUsdValueKMB(num);
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
