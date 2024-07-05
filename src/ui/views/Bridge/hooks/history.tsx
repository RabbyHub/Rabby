import { useInViewport, useInfiniteScroll } from 'ahooks';
import React, { useEffect, useRef, useState } from 'react';
import { useRabbySelector } from '@/ui/store';
import { useAsync } from 'react-use';
import { uniqBy } from 'lodash';
import { SwapItem } from '@rabby-wallet/rabby-api/dist/types';
import { useWallet } from '@/ui/utils';

export const useBridgeHistory = () => {
  const addr = useRabbySelector(
    (state) => state.account.currentAccount?.address || ''
  );

  const [refreshTxListCount, setRefreshListTx] = useState(0);
  const refreshSwapListTx = React.useCallback(() => {
    setRefreshListTx((e) => e + 1);
  }, []);
  const isInSwap = true;

  const wallet = useWallet();
  const getSwapList = React.useCallback(
    async (addr: string, start = 0, limit = 5) => {
      const data = await wallet.openapi.getBridgeHistoryList({
        user_addr: addr,
        start: start,
        limit: limit,
      });
      return {
        list: data?.history_list,
        last: data,
        totalCount: data?.total_cnt,
      };
    },
    [wallet?.openapi?.getSwapTradeList]
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
      getSwapList(
        addr,
        d?.list?.length && d?.list?.length > 1 ? d?.list?.length : 0,
        5
      ),
    {
      reloadDeps: [isInSwap],
      isNoMore(data) {
        if (data) {
          return data?.list.length >= data?.totalCount;
        }
        return true;
      },
      manual: !isInSwap || !addr,
    }
  );

  const { value } = useAsync(async () => {
    if (addr) {
      return getSwapList(addr, 0, 5);
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
            (e) => `${e.chain}-${e.tx_id}`
          ) as SwapItem[],
        };
      });
    }
  }, [mutate, value]);

  const ref = useRef<HTMLDivElement>(null);

  const [inViewport] = useInViewport(ref);

  useEffect(() => {
    if (!noMore && inViewport && !loadingMore && loadMore && isInSwap) {
      loadMore();
    }
  }, [inViewport, loadMore, loading, loadingMore, noMore, isInSwap]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (
      !loading &&
      !loadingMore &&
      txList?.list?.some((e) => e.status !== 'Finished') &&
      isInSwap
    ) {
      timer = setTimeout(refreshSwapListTx, 2000);
    }
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [loading, loadingMore, refreshSwapListTx, txList?.list, isInSwap]);

  return {
    loading,
    txList,
    loadingMore,
    ref,
  };
};
