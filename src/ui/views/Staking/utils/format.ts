import BigNumber from 'bignumber.js';
import type { TokenItem } from 'background/service/openapi';

import { normalizeInputNumber } from '@/constant/regexp';
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

export const isStakingAmountPrecisionExceeded = (
  value: string,
  decimals?: number
) => {
  if (!value || !value.includes('.')) {
    return false;
  }
  if (typeof decimals !== 'number' || !Number.isFinite(decimals)) {
    return false;
  }

  const decimalPlaces = value.split('.')[1]?.length || 0;
  return decimalPlaces > Math.max(0, decimals);
};

export const normalizeStakingAmountInput = (
  value: string,
  decimals?: number
) => {
  const normalized = normalizeInputNumber(value);
  if (normalized === null) {
    return null;
  }

  if (!normalized.includes('.')) {
    return normalized;
  }

  if (typeof decimals !== 'number' || !Number.isFinite(decimals)) {
    return normalized;
  }

  const safeDecimals = Math.max(0, decimals);
  if (safeDecimals === 0) {
    return null;
  }

  const decimalPlaces = normalized.split('.')[1]?.length || 0;
  if (decimalPlaces > safeDecimals) {
    return null;
  }

  return normalized;
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
