import { useInViewport, useInfiniteScroll } from 'ahooks';
import React, { useEffect, useRef, useState } from 'react';
import { useRabbySelector } from '@/ui/store';
import { useAsync } from 'react-use';
import { uniqBy } from 'lodash';
import type { BridgeHistory } from '@rabby-wallet/rabby-api/dist/types';
import { useWallet } from '@/ui/utils';
import eventBus from '@/eventBus';
import { EVENTS } from '@/constant';
import {
  refreshBridgeHistoryTop10,
  TOP_HISTORY_LIMIT,
} from '../utils/historyCache';

const bridgeHistoryKey = (item: BridgeHistory) =>
  `${item.from_token?.chain ?? ''}:${(
    item.from_tx?.tx_id ||
    item.detail_url ||
    ''
  ).toLowerCase()}`;

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
    async (address: string, start = 0, limit = TOP_HISTORY_LIMIT) => {
      // 首屏缓存是 10 条，这一页也按 10 条计。
      const requestedLimit = start === 0 ? TOP_HISTORY_LIMIT : limit;
      const data =
        start === 0
          ? await refreshBridgeHistoryTop10(wallet, address)
          : await wallet.openapi.getBridgeHistoryList({
              user_addr: address,
              start,
              limit: requestedLimit,
              is_all: true,
            });
      if (data?.history_list && start === 0) {
        eventBus.emit(EVENTS.BRIDGE_HISTORY_UPDATED, data.history_list);
      }
      return {
        list: data?.history_list?.slice(0, requestedLimit) ?? [],
        last: data,
        totalCount: data?.total_cnt,
        // 按请求行数翻页，不用已展示条数。
        nextStart: start + requestedLimit,
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
    async (d) => {
      const page = await getBridgeHistoryList(
        addr,
        d?.nextStart ?? 0,
        TOP_HISTORY_LIMIT
      );
      if (!d?.list?.length || !page.list?.length) {
        return page;
      }
      const seen = new Set(d.list.map(bridgeHistoryKey));
      return {
        ...page,
        list: page.list.filter((item) => !seen.has(bridgeHistoryKey(item))),
      };
    },
    {
      isNoMore(data) {
        if (!data || typeof data.totalCount !== 'number') {
          return !data;
        }
        return (data.nextStart ?? 0) >= data.totalCount;
      },
      manual: !addr,
    }
  );

  const { value } = useAsync(async () => {
    if (addr) {
      return getBridgeHistoryList(addr, 0, TOP_HISTORY_LIMIT);
    }
  }, [addr, refreshTxListCount]);

  useEffect(() => {
    if (value?.list) {
      mutate((d) => {
        if (!d) {
          return value;
        }
        return {
          last: d?.last,
          totalCount: value.totalCount ?? d?.totalCount,
          nextStart: d.nextStart,
          list: uniqBy(
            [...(value.list || []), ...(d?.list || [])],
            bridgeHistoryKey
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
