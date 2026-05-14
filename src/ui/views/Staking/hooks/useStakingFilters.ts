import { useRequest } from 'ahooks';

import { useRabbySelector } from '@/ui/store';
import { useWallet } from '@/ui/utils';

import type { StakingFilterListResponseApi } from '../types';
import { normalizeStakingFilterList } from '../utils/normalize';

export const useStakingFilters = () => {
  const wallet = useWallet();
  const account = useRabbySelector((state) => state.account.currentAccount);

  return useRequest(
    async () => {
      const response = (await wallet.openapi.getStakingFilterList(
        account?.address
          ? {
              user_addr: account.address,
            }
          : undefined
      )) as StakingFilterListResponseApi;
      return normalizeStakingFilterList(response);
    },
    {
      refreshDeps: [account?.address],
    }
  );
};
