import { useInViewport, useInfiniteScroll } from 'ahooks';
import React, { useEffect, useRef, useState } from 'react';
import { useQuoteMethods } from './quote';
import { useRabbySelector } from '@/ui/store';
import { useAsync } from 'react-use';
import { uniqBy } from 'lodash';
import { SwapItem } from '@rabby-wallet/rabby-api/dist/types';
import { useWallet } from '@/ui/utils';

export const usePollSwapPendingNumber = (timer = 10000) => {
  const [refetchCount, setRefetchCount] = useState(0);

  const wallet = useWallet();

  const { value, loading, error } = useAsync(async () => {
    const account = await wallet.getCurrentAccount();
    if (!account?.address) {
      return 0;
    }

    const data = await wallet.openapi.getSwapTradeList({
      user_addr: account!.address,
      start: '0',
      limit: '10',
    });
    return (
      data?.history_list?.filter((item) => item?.status === 'Pending')
        ?.length || 0
    );
  }, [refetchCount]);

  const timerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if ((!loading && value !== undefined) || error) {
      timerRef.current = setTimeout(() => {
        setRefetchCount((e) => e + 1);
      }, timer);
    }

    return () => {
      timerRef.current && clearTimeout(timerRef.current);
    };
  }, [loading, value, error, timer]);

  useEffect(() => {
    return () => {
      timerRef.current && clearTimeout(timerRef.current);
    };
  }, []);

  return value;
};

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
