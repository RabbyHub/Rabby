import BigNumber from 'bignumber.js';
import { formatUsdValueKMB } from '@/ui/views/Dashboard/components/TokenDetailPopup/utils';

export const formatSpotPctChange = (change: number | null | undefined) => {
  if (change === null || change === undefined || !Number.isFinite(change)) {
    return '-';
  }
  const sign = change > 0 ? '+' : change < 0 ? '-' : '';
  return `${sign}${Math.abs(change * 100).toFixed(2)}%`;
};

export const getSpotChangeColorClass = (change: number | null | undefined) => {
  if (!change) {
    return 'text-r-neutral-foot';
  }
  return change > 0 ? 'text-r-green-default' : 'text-r-red-default';
};

export const formatSpotVolume = (value: string | null | undefined) =>
  value && new BigNumber(value).gt(0) ? formatUsdValueKMB(value) : '-';
