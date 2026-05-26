import { useMemo } from 'react';
import { useRequest } from 'ahooks';

import { useRabbySelector } from '@/ui/store';
import { useWallet } from '@/ui/utils';

import type {
  StakingPool,
  StakingPoolListParams,
  StakingPoolListResponseApi,
} from '../types';
import { normalizeStakingPoolList } from '../utils/normalize';

export interface UseStakingPoolsParams {
  q?: string;
  chainId?: string;
  protocolId?: string;
  myHoldingOnly?: boolean;
  start?: number;
  limit?: number;
}

export const useStakingPools = ({
  q,
  chainId,
  protocolId,
  myHoldingOnly,
  start = 0,
  limit = 20,
}: UseStakingPoolsParams) => {
  const wallet = useWallet();
  const account = useRabbySelector((state) => state.account.currentAccount);

  const requestParams = useMemo<StakingPoolListParams>(
    () => ({
      q: q?.trim() || undefined,
      chain_id: chainId || undefined,
      protocol_id: protocolId || undefined,
      user_addr: account?.address || undefined,
      holding_only: myHoldingOnly && account?.address ? true : undefined,
      start,
      limit,
      order_by: 'tvl',
      order: 'desc',
    }),
    [account?.address, chainId, limit, myHoldingOnly, protocolId, q, start]
  );

  return useRequest(
    async () => {
      const allPools: StakingPool[] = [];
      let total = 0;
      let nextStart = start;
      let pageLimit = limit;
      let hasMore = true;

      while (hasMore) {
        const response = (await wallet.openapi.getStakingPoolList({
          ...requestParams,
          start: nextStart,
          limit,
        })) as StakingPoolListResponseApi;
        const normalized = normalizeStakingPoolList(response, {
          start: nextStart,
          limit,
        });

        allPools.push(...normalized.pools);
        total = normalized.page.total;
        pageLimit = normalized.page.limit || limit;

        if (
          !normalized.pools.length ||
          allPools.length >= total ||
          normalized.pools.length < pageLimit
        ) {
          hasMore = false;
        } else {
          nextStart = normalized.page.start + pageLimit;
        }
      }

      return {
        pools: allPools,
        page: {
          start,
          limit,
          total,
        },
      };
    },
    {
      refreshDeps: [
        account?.address,
        chainId,
        limit,
        myHoldingOnly,
        protocolId,
        q,
        start,
      ],
    }
  );
};
