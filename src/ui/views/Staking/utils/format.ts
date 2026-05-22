import BigNumber from 'bignumber.js';
import type { TokenItem } from 'background/service/openapi';

import { formatTVL, formatTokenAmount, formatUsdValue } from '@/ui/utils';
import { tokenAmountBn } from '@/ui/utils/token';

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

export const toStakingPlainAmount = (value?: string | number | null) => {
  if (value === undefined || value === null) {
    return '0';
  }

  const number = new BigNumber(value);
  if (!number.isFinite()) {
    return '0';
  }

  return number.toString(10);
};

export const getStakingTokenBalanceAmount = (
  token?: Pick<TokenItem, 'amount' | 'decimals' | 'raw_amount_hex_str'> | null,
  fallback?: string | number | null
) => {
  if (
    token?.raw_amount_hex_str &&
    typeof token.decimals === 'number' &&
    Number.isFinite(token.decimals)
  ) {
    const amount = tokenAmountBn(token as TokenItem);
    if (amount.isFinite()) {
      return amount.toString(10);
    }
  }

  return toStakingPlainAmount(fallback ?? token?.amount ?? 0);
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
