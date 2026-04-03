import openapiService, { TxHistoryItem } from '@/background/service/openapi';
import { Account } from '@/background/service/preference';
import { UI_TYPE } from '@/constant/ui';
import { isSupportDBAccount } from '@/utils/account';
import { transformToHistory } from '@/utils/history';
import { useInfiniteScroll, useRequest } from 'ahooks';
import Dexie from 'dexie';
import { last, sortBy, has } from 'lodash';
import { db } from '..';
import { historyDbService } from '../services/historyDbService';
import { useMemo } from 'react';

export const useSyncDbHistory = (options: { account?: Account | null }) => {
  // return useQuery({
  //   queryKey: ['syncHistory', options.address],
  //   queryFn: async () => {
  //     const { address } = options;
  //     await historyDbService.sync({ address });
  //   },
  //   refetchOnWindowFocus: false,
  //   refetchOnReconnect: false,
  //   staleTime: 1 * 60 * 1000, // 1 minute
  //   cacheTime: 5 * 60 * 1000, // 5 minutes
  // });

  return useRequest(
    async () => {
      const { account } = options;
      if (
        !account?.address ||
        !isSupportDBAccount(account) ||
        !(UI_TYPE.isDesktop || UI_TYPE.isPop)
      ) {
        return;
      }
      return historyDbService.sync({ address: account.address });
    },
    {
      refreshDeps: [options.account?.address],
      cacheKey: `syncHistory-${options.account?.address}`,
      staleTime: 0.5 * 60 * 1000,
    }
  );
};

const PAGE_COUNT = 20;

export const useQueryDbHistory = (options: {
  account?: Account | null;
  isFilterScam?: boolean;
  serverChainId?: string;
}) => {
  const { account, isFilterScam, serverChainId } = options;

  const { loading: isSyncing } = useSyncDbHistory({ account });

  const { data, loading } = useRequest(
    async (d) => {
      const startTime = d?.last || 0;
      const address = account?.address;
      if (!address) {
        return [];
      }

      if (isSupportDBAccount(account)) {
        const list = await db.history
          .where('[owner_addr+time_at]')
          .between(
            [address.toLowerCase(), startTime],
            [address.toLowerCase(), Dexie.maxKey]
          )
          .reverse()
          .sortBy('time_at');

        return list;
      }

      const res = await openapiService.getAllTxHistory({
        id: address,
      });

      return transformToHistory({ data: res || [], address });
    },
    {
      refreshDeps: [account?.address, account?.type],
    }
  );

  const list = useMemo(() => {
    return (data || []).filter((item) => {
      let flag = true;
      if (isFilterScam) {
        flag = !item.is_scam && !item.is_small_tx;
      }
      if (serverChainId) {
        flag = flag && item.chain === serverChainId;
      }
      return flag;
    });
  }, [data, isFilterScam, serverChainId]);

  return {
    data: list,
    loading: loading || isSyncing,
  };
};
