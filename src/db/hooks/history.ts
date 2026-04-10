import { is } from 'immer/dist/internal';
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
import { useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';

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
      staleTime: 10 * 1000,
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

  const isSupportAccount = useMemo(() => isSupportDBAccount(account), [
    account,
  ]);

  const dbHistory = useLiveQuery(() => {
    if (!account?.address || !isSupportAccount) {
      return [];
    }
    const address = account?.address;
    return db.history
      .where('owner_addr')
      .equalsIgnoreCase(address)
      .and((item) => {
        let flag = true;
        if (isFilterScam) {
          flag = !item.is_scam && !item.is_small_tx;
        }
        if (serverChainId) {
          flag = flag && item.chain === serverChainId;
        }
        return flag;
      })
      .reverse()
      .sortBy('time_at');
  }, [isSupportAccount, account?.address, isFilterScam, serverChainId]);

  const { data, loading } = useRequest(
    async (d) => {
      const startTime = d?.last || 0;
      const address = account?.address;
      if (!address || isSupportAccount) {
        return [];
      }

      const res = await openapiService.getAllTxHistory({
        id: address,
      });

      return transformToHistory({ data: res || [], address });
    },
    {
      refreshDeps: [account?.address, account?.type, isSupportAccount],
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

  const result = useMemo(() => {
    if (isSupportAccount) {
      return dbHistory || [];
    }
    return list;
  }, [dbHistory, list, isSupportAccount]);

  return {
    data: result,
    loading: !isSupportAccount ? loading : isSyncing || dbHistory === undefined,
  };
};
