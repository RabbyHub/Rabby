import { useMemo } from 'react';
import { useRequest } from 'ahooks';

import { useRabbySelector } from '@/ui/store';
import { useWallet } from '@/ui/utils';

import type {
  StakingPool,
  StakingPoolList,
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

  const cacheKey = useMemo(
    () =>
      [
        'staking-pools',
        account?.address || 'no-account',
        requestParams.q || '',
        requestParams.chain_id || '',
        requestParams.protocol_id || '',
        requestParams.holding_only ? 'holding' : 'all',
        start,
        limit,
      ].join(':'),
    [
      account?.address,
      limit,
      requestParams.chain_id,
      requestParams.holding_only,
      requestParams.protocol_id,
      requestParams.q,
      start,
    ]
  );

  return useRequest(
    async () => {
      const response = (await wallet.openapi.getStakingPoolList({
        ...requestParams,
        start,
        limit,
      })) as StakingPoolListResponseApi;
      const firstPage = normalizeStakingPoolList(response, {
        start,
        limit,
      });
      const allPools: StakingPool[] = [...firstPage.pools];
      const total = firstPage.page.total;
      const pageLimit = firstPage.page.limit || limit;

      if (
        firstPage.pools.length &&
        allPools.length < total &&
        firstPage.pools.length >= pageLimit
      ) {
        const nextStarts: number[] = [];
        for (
          let nextStart = firstPage.page.start + pageLimit;
          nextStart < total;
          nextStart += pageLimit
        ) {
          nextStarts.push(nextStart);
        }

        const remainingPageResults = await Promise.allSettled(
          nextStarts.map(async (nextStart) => {
            const nextResponse = (await wallet.openapi.getStakingPoolList({
              ...requestParams,
              start: nextStart,
              limit: pageLimit,
            })) as StakingPoolListResponseApi;
            return normalizeStakingPoolList(nextResponse, {
              start: nextStart,
              limit: pageLimit,
            });
          })
        );

        remainingPageResults
          .filter(
            (result): result is PromiseFulfilledResult<StakingPoolList> =>
              result.status === 'fulfilled'
          )
          .map((result) => result.value)
          .sort((a, b) => a.page.start - b.page.start)
          .forEach((page) => {
            allPools.push(...page.pools);
          });
      }

      return {
        pools: allPools,
        page: {
          start,
          limit: pageLimit,
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
      cacheKey,
      staleTime: 0,
      cacheTime: 5 * 60 * 1000,
    }
  );
};
