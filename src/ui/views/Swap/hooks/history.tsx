import { useInViewport, useInfiniteScroll } from 'ahooks';
import React, { useEffect, useRef, useState } from 'react';
import { useQuoteMethods } from './quote';
import { useRabbySelector } from '@/ui/store';
import { useAsync } from 'react-use';
import { uniqBy } from 'lodash';
import { SwapItem } from '@rabby-wallet/rabby-api/dist/types';

export const useSwapHistory = () => {
  const { getSwapList } = useQuoteMethods();
  const addr = useRabbySelector(
    (state) => state.account.currentAccount?.address || ''
  );

  const [refreshSwapTxListCount, setRefreshSwapListTx] = useState(0);
  const refreshSwapListTx = React.useCallback(() => {
    setRefreshSwapListTx((e) => e + 1);
  }, []);
  const isInSwap = true;

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
  }, [addr, refreshSwapTxListCount]);

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
