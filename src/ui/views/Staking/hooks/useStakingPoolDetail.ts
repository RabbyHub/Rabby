import { useRequest } from 'ahooks';

import { useRabbySelector } from '@/ui/store';
import { useWallet } from '@/ui/utils';

import type { StakingPoolDetailResponseApi } from '../types';
import { normalizeStakingPool } from '../utils/normalize';

export const useStakingPoolDetail = (poolId?: string) => {
  const wallet = useWallet();
  const account = useRabbySelector((state) => state.account.currentAccount);

  return useRequest(
    async () => {
      if (!poolId) {
        return;
      }

      const response = (await wallet.openapi.getStakingPool({
        pool_id: poolId,
        user_addr: account?.address || undefined,
      })) as StakingPoolDetailResponseApi;

      if (!response?.pool) {
        return;
      }

      return normalizeStakingPool(response.pool);
    },
    {
      ready: !!poolId,
      refreshDeps: [account?.address, poolId],
    }
  );
};
