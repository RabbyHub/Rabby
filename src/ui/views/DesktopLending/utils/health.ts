import BigNumber from 'bignumber.js';
import { formatNumber } from '@/ui/utils';

export const getHealthFactorText = (healthFactor: string) => {
  if (Number(healthFactor) > 100) {
    return '100+';
  }
  // 健康值保守点，向下取整
  return formatNumber(healthFactor, 2, {}, BigNumber.ROUND_FLOOR);
};
