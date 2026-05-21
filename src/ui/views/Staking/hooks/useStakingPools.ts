import { useMemo } from 'react';
import { useRequest } from 'ahooks';

import { useRabbySelector } from '@/ui/store';
import { useWallet } from '@/ui/utils';

import type {
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
      const response = (await wallet.openapi.getStakingPoolList(
        requestParams
      )) as StakingPoolListResponseApi;
      const normalized = normalizeStakingPoolList(response, {
        start,
        limit,
      });
      return normalized;
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
