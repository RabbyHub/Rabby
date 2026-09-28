import type { Account } from '@/background/service/preference';
import { UI_TYPE } from '@/constant/ui';
import { useWallet } from '@/ui/utils';
import { isSupportDBAccount } from '@/utils/account';
import { findChain } from '@/utils/chain';
import { markGasDepositTxs, transformToHistory } from '@/utils/history';
import { useInfiniteScroll, useRequest } from 'ahooks';
import { useLiveQuery } from 'dexie-react-hooks';
import { last, sortBy } from 'lodash';
import { useCallback, useMemo, useState } from 'react';
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
const DB_PAGE_COUNT = 50;

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

  // Keyed so a new account or filter starts again from the first page
  // without an effect.
  const dbQueryKey = [
    account?.address?.toLowerCase() || '',
    isFilterScam ? 'noScam' : '',
    serverChainId || '',
  ].join(':');
  const [dbLimitState, setDbLimitState] = useState({
    key: dbQueryKey,
    limit: DB_PAGE_COUNT,
  });
  const dbLimit =
    dbLimitState.key === dbQueryKey ? dbLimitState.limit : DB_PAGE_COUNT;

  const dbHistory = useLiveQuery(() => {
    if (!account?.address || !isSupportAccount) {
      return [];
    }
    return historyDbService.queryRecent({
      address: account.address,
      isFilterScam,
      serverChainId,
      limit: dbLimit,
    });
  }, [
    isSupportAccount,
    account?.address,
    isFilterScam,
    serverChainId,
    dbLimit,
  ]);

  const loadMoreDbHistory = useCallback(() => {
    setDbLimitState({ key: dbQueryKey, limit: dbLimit + DB_PAGE_COUNT });
  }, [dbQueryKey, dbLimit]);

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
      const res = await wallet.openapi.listTxHistory({
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

  // A new gas deposit tx is in the local tx store before it reaches history,
  // and lands at the top once it does, so refetching when the newest item
  // changes is enough.
  const newestKey = result[0] ? `${result[0].chain}:${result[0].id}` : '';
  const { data: gasDepositTxKeys } = useRequest(
    () =>
      wallet
        .getGasDepositTxKeys()
        .then((keys) => new Set(keys))
        .catch(() => new Set<string>()),
    {
      refreshDeps: [account?.address, newestKey],
    }
  );

  const enrichedResult = useMemo<TxHistoryItemWithGasDeposit[]>(
    () =>
      markGasDepositTxs(
        result,
        gasDepositTxKeys,
        (serverId) => findChain({ serverId })?.id
      ),
    [gasDepositTxKeys, result]
  );

  return {
    data: enrichedResult,
    loading: !isSupportAccount
      ? isLoadingApiHistory
      : isSyncing || dbHistory === undefined,
    loadingMore: !isSupportAccount && loadingMore,
    loadMore: isSupportAccount ? loadMoreDbHistory : loadMore,
    noMore: isSupportAccount
      ? !dbHistory || dbHistory.length < dbLimit
      : noMore,
  };
};
