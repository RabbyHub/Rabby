import { useRequest } from 'ahooks';

import { useWallet } from '@/ui/utils';

import type {
  StakingPoolCurveMetric,
  StakingPoolCurveResponseApi,
} from '../types';
import { normalizeStakingPoolCurve } from '../utils/normalize';

export const useStakingPoolCurve = (
  poolId: string | undefined,
  metric: StakingPoolCurveMetric
) => {
  const wallet = useWallet();

  return useRequest(
    async () => {
      if (!poolId) {
        return [];
      }

      const response = (await wallet.openapi.getStakingPoolCurve({
        pool_id: poolId,
        metric,
      })) as StakingPoolCurveResponseApi;

      return normalizeStakingPoolCurve(response);
    },
    {
      ready: !!poolId,
      refreshDeps: [metric, poolId],
    }
  );
};
