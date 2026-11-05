import { useInViewport, useInfiniteScroll } from 'ahooks';
import React, { useEffect, useRef, useState } from 'react';
import { useRabbySelector } from '@/ui/store';
import { useAsync } from 'react-use';
import { uniqBy } from 'lodash';
import { useWallet } from '@/ui/utils';
import eventBus from '@/eventBus';
import { EVENTS } from '@/constant';
import { refreshBridgeHistoryTop10 } from '../utils/historyCache';

export const useBridgeHistory = () => {
  const addr = useRabbySelector(
    (state) => state.account.currentAccount?.address || ''
  );

  const [refreshTxListCount, setRefreshListTx] = useState(0);
  const refreshBridgeListTx = React.useCallback(() => {
    setRefreshListTx((e) => e + 1);
  }, []);

  const wallet = useWallet();
  const getBridgeHistoryList = React.useCallback(
    async (addr: string, start = 0, limit = 5) => {
      const data =
        start === 0
          ? await refreshBridgeHistoryTop10(wallet, addr)
          : await wallet.openapi.getBridgeHistoryList({
              user_addr: addr,
              start,
              limit,
              is_all: true,
            });
      if (data?.history_list && start === 0) {
        eventBus.emit(EVENTS.BRIDGE_HISTORY_UPDATED, data.history_list);
      }
      return {
        list: data?.history_list?.slice(0, limit),
        last: data,
        totalCount: data?.total_cnt,
      };
    },
    [wallet]
  );

  const {
    data: txList,
    loading,
    loadMore,
    loadingMore,
    noMore,
    mutate,
  } = useInfiniteScroll(
    (d) =>
      getBridgeHistoryList(
        addr,
        d?.list?.length && d?.list?.length > 1 ? d?.list?.length : 0,
        5
      ),
    {
      isNoMore(data) {
        if (data) {
          return data?.list.length >= data?.totalCount;
        }
        return true;
      },
      manual: !addr,
    }
  );

  const { value } = useAsync(async () => {
    if (addr) {
      return getBridgeHistoryList(addr, 0, 5);
    }
  }, [addr, refreshTxListCount]);

  useEffect(() => {
    if (value?.list) {
      mutate((d) => {
        if (!d) {
          return;
        }
        return {
          last: d?.last,
          totalCount: d?.totalCount,
          list: uniqBy(
            [...(value.list || []), ...(d?.list || [])],
            (e) => `${e.chain}-${e.detail_url}`
          ),
        };
      });
    }
  }, [mutate, value]);

  const ref = useRef<HTMLDivElement>(null);

  const [inViewport] = useInViewport(ref);

  useEffect(() => {
    if (!noMore && inViewport && !loadingMore && loadMore) {
      loadMore();
    }
  }, [inViewport, loadMore, loading, loadingMore, noMore]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (
      !loading &&
      !loadingMore &&
      txList?.list?.some((e) => e.status === 'pending')
    ) {
      timer = setTimeout(refreshBridgeListTx, 2000);
    }
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [loading, loadingMore, refreshBridgeListTx, txList?.list]);

  return {
    loading,
    txList,
    loadingMore,
    ref,
  };
};
