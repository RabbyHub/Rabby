import { formatNumber } from '@/ui/utils';

export const getHealthFactorText = (healthFactor: string) => {
  if (Number(healthFactor) > 100) {
    return '100+';
  }
  return formatNumber(healthFactor);
};
