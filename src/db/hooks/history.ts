import type { Account } from '@/background/service/preference';
import { UI_TYPE } from '@/constant/ui';
import { useWallet } from '@/ui/utils';
import { isSupportDBAccount } from '@/utils/account';
import { findChain } from '@/utils/chain';
import { transformToHistory } from '@/utils/history';
import { useInfiniteScroll, useRequest } from 'ahooks';
import { useLiveQuery } from 'dexie-react-hooks';
import { last, sortBy } from 'lodash';
import { useMemo } from 'react';
import { db } from '..';
import { historyDbService } from '../services/historyDbService';
import { TxHistoryItemRow } from '../schema/history';

export type TxHistoryItemWithGasDeposit = TxHistoryItemRow & {
  isGasDeposit?: boolean;
};

export const useSyncDbHistory = (options: { account?: Account | null }) => {
  const wallet = useWallet();
  const isSupportAccount = isSupportDBAccount(options.account);

  return useRequest(
    async () => {
      const { account } = options;
      if (
        !account?.address ||
        !isSupportAccount ||
        !(UI_TYPE.isDesktop || UI_TYPE.isPop)
      ) {
        return;
      }
      return historyDbService.sync({
        openapi: wallet.openapi,
        address: account.address,
      });
    },
    {
      refreshDeps: [options.account?.address, isSupportAccount],
      cacheKey: `syncHistory-${options.account?.address}-${isSupportAccount}`,
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
  const wallet = useWallet();

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

  const apiQueryKey = [
    account?.address?.toLowerCase() || '',
    serverChainId || '',
  ].join(':');

  const {
    data: apiHistory,
    loading: isLoadingApiHistory,
    loadingMore,
    loadMore,
    noMore,
  } = useInfiniteScroll(
    async (currentData) => {
      const address = account?.address;
      if (!address || isSupportAccount) {
        return {
          queryKey: apiQueryKey,
          last: undefined,
          list: [],
          pageSize: 0,
        };
      }

      const startTime =
        currentData?.queryKey === apiQueryKey ? currentData.last || 0 : 0;
      const res = await wallet.openapi.listTxHisotry({
        id: address,
        start_time: startTime,
        page_count: PAGE_COUNT,
        chain_id: serverChainId,
      });
      const list = sortBy(
        transformToHistory({ data: res, address }),
        (item) => -item.time_at
      );

      return {
        queryKey: apiQueryKey,
        last: last(list)?.time_at,
        list,
        pageSize: res.history_list.length,
      };
    },
    {
      manual: !account?.address || isSupportAccount,
      reloadDeps: [apiQueryKey, account?.type, isSupportAccount],
      isNoMore: (data) => {
        return !data?.last || data.pageSize < PAGE_COUNT;
      },
    }
  );

  const list = useMemo(() => {
    const data =
      apiHistory?.queryKey === apiQueryKey ? apiHistory.list || [] : [];
    return data.filter((item) => {
      let flag = true;
      if (isFilterScam) {
        flag = !item.is_scam && !item.is_small_tx;
      }
      if (serverChainId) {
        flag = flag && item.chain === serverChainId;
      }
      return flag;
    });
  }, [apiHistory, apiQueryKey, isFilterScam, serverChainId]);

  const result = useMemo(() => {
    if (isSupportAccount) {
      return dbHistory || [];
    }
    return list;
  }, [dbHistory, list, isSupportAccount]);

  const resultKey = useMemo(
    () => result.map((item) => `${item.chain}:${item.id}`).join('|'),
    [result]
  );

  const { data: gasDepositKeySet } = useRequest(
    async () => {
      if (!result.length) {
        return new Set<string>();
      }

      const txs = result.map((item) => ({
        chainId: findChain({ serverId: item.chain })?.id,
        hash: item.id,
      }));
      const checks = await wallet
        .checkIsGasDepositTxs(txs)
        .catch(() => [] as boolean[]);
      const entries = result.map(
        (item, index) => [`${item.chain}:${item.id}`, !!checks[index]] as const
      );

      return new Set(
        entries.filter(([, isGasDeposit]) => isGasDeposit).map(([key]) => key)
      );
    },
    {
      refreshDeps: [resultKey],
    }
  );

  const enrichedResult = useMemo<TxHistoryItemWithGasDeposit[]>(
    () =>
      result.map((item) => {
        if (!gasDepositKeySet?.has(`${item.chain}:${item.id}`)) {
          return item;
        }

        return {
          ...item,
          isGasDeposit: true,
        };
      }),
    [gasDepositKeySet, result]
  );

  return {
    data: enrichedResult,
    loading: !isSupportAccount
      ? isLoadingApiHistory
      : isSyncing || dbHistory === undefined,
    loadingMore: !isSupportAccount && loadingMore,
    loadMore,
    noMore: isSupportAccount || noMore,
  };
};
