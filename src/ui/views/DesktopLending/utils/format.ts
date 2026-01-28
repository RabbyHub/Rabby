import BigNumber from 'bignumber.js';

// TODO： 下面三个format都要check下看和移动端能不能对齐
import { formatUsdValueKMB } from '../../Dashboard/components/TokenDetailPopup/utils';
import { formatPercent } from '../../Perps/utils';
import { formatUsdValue } from '@/ui/utils/number';

export const estDaily = (netWorth: string, netApy: number) => {
  if (!netWorth || !netApy) {
    return '--';
  }
  const dailyEarnings = new BigNumber(netWorth);
  const bigApy = new BigNumber(netApy);
  return `${netApy > 0 ? '+' : ''}${formatUsdValue(
    dailyEarnings.multipliedBy(bigApy).dividedBy(365).toNumber()
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

export const formatApy = (apy: number) => {
  if (!apy) {
    return '0%';
  }
  if (apy < 0.0001) {
    return '<0.01%';
  }
  return formatPercent(apy);
};
