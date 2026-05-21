import BigNumber from 'bignumber.js';

import { formatTVL, formatTokenAmount, formatUsdValue } from '@/ui/utils';

export const formatStakingUsd = (value?: number | null) => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return '-';
  }
  return formatUsdValue(value);
};

export const formatStakingTVL = (value?: number | null) => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return '-';
  }
  return formatTVL(value);
};

export const formatStakingPercent = (value?: number | null) => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return '-';
  }

  const percent = new BigNumber(value).multipliedBy(100);
  if (!percent.isFinite()) {
    return '-';
  }

  return `${percent.toFixed(2)}%`;
};

export const formatStakingNumber = (value?: number | null) => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return '-';
  }

  const number = new BigNumber(value);
  if (!number.isFinite()) {
    return '-';
  }

  return number.toFormat(2);
};

export const formatStakingAmount = (
  value?: string | number | null,
  maxDecimals = 6
) => {
  if (value === undefined || value === null) {
    return '-';
  }

  const number = new BigNumber(value);
  if (!number.isFinite()) {
    return '-';
  }
  if (number.isZero()) {
    return '0';
  }

  return formatTokenAmount(number.toFixed(), maxDecimals);
};

export const shortenStakingAddress = (address?: string | null) => {
  if (!address) {
    return '-';
  }

  if (address.length <= 12) {
    return address;
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};
