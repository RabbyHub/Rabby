import { useInViewport, useInfiniteScroll } from 'ahooks';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRabbySelector } from '@/ui/store';
import { useAsync } from 'react-use';
import { uniqBy } from 'lodash';
import { useWallet } from '@/ui/utils';
import { BridgeTxHistoryItem } from '@/background/service/transactionHistory';
import { ONE_DAY_MS, ONE_HOUR_MS } from '../constants';
import { useInterval } from 'ahooks';

export const useCheckBridgePendingItem = (timer = 5000) => {
  const wallet = useWallet();
  const [needPoll, setNeedPoll] = useState(false);
  const currentAccount = useRabbySelector(
    (state) => state.account.currentAccount
  );

  const checkPendingItem = useCallback(async () => {
    const userAddress = currentAccount?.address;
    if (!userAddress) {
      setNeedPoll(false);
      return;
    }
    const historyData = (await wallet.getRecentPendingTxHistory(
      userAddress,
      'bridge'
    )) as BridgeTxHistoryItem;

    if (!historyData) {
      setNeedPoll(false);
      return;
    }

    // tx create time is more than one day, set this tx failed and no show in loading pendingTxItem
    if (
      historyData?.createdAt &&
      Date.now() - historyData.createdAt > ONE_DAY_MS
    ) {
      wallet.completeBridgeTxHistory(
        historyData.hash,
        historyData.fromChainId!,
        'failed'
      );
      setNeedPoll(false);
      return;
    }

    const data = await wallet.openapi.getBridgeHistoryList({
      user_addr: userAddress,
      start: 0,
      limit: 10,
      is_all: true,
    });

    const findTx = data.history_list.find(
      (item) => item.from_tx?.tx_id === historyData.hash
    );

    if (findTx) {
      const isPending = findTx.status === 'pending';
      if (isPending) {
        setNeedPoll(true);
        return;
      } else {
        const status = findTx.status === 'completed' ? 'allSuccess' : 'failed';
        wallet.completeBridgeTxHistory(
          historyData.hash,
          historyData.fromChainId,
          status,
          findTx
        );
      }
    } else {
      const currentTime = Date.now();
      const txCreateTime = historyData.createdAt;
      if (currentTime - txCreateTime > ONE_HOUR_MS) {
        // tx create time is more than 60 minutes, set this tx failed
        wallet.completeBridgeTxHistory(
          historyData.hash,
          historyData.fromChainId,
          'failed'
        );
      }
    }
    setNeedPoll(false);
  }, [currentAccount]);

  useEffect(() => {
    checkPendingItem();
  }, [checkPendingItem]);

  useInterval(needPoll ? checkPendingItem : () => {}, timer);
};

export const usePollBridgePendingNumber = (timer = 5000) => {
  const [refetchCount, setRefetchCount] = useState(0);

  const wallet = useWallet();

  const { value, loading, error } = useAsync(async () => {
    const account = await wallet.getCurrentAccount();
    if (!account?.address) {
      return {
        pendingNumber: 0,
        historyList: [],
      };
    }

    const data = await wallet.openapi.getBridgeHistoryList({
      user_addr: account!.address,
      start: 0,
      limit: 10,
      is_all: true,
    });
    // return (
    //   data?.history_list?.filter((item) => item?.status === 'pending')
    //     ?.length || 0
    // );
    return {
      pendingNumber:
        data?.history_list?.filter((item) => item?.status === 'pending')
          ?.length || 0,
      historyList: data?.history_list || [],
    };
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

export const useBridgeHistory = () => {
  const addr = useRabbySelector(
    (state) => state.account.currentAccount?.address || ''
  );

  const [refreshTxListCount, setRefreshListTx] = useState(0);
  const refreshBridgeListTx = React.useCallback(() => {
    setRefreshListTx((e) => e + 1);
  }, []);
  const isInBridge = true;

  const wallet = useWallet();
  const getBridgeHistoryList = React.useCallback(
    async (addr: string, start = 0, limit = 5) => {
      const data = await wallet.openapi.getBridgeHistoryList({
        user_addr: addr,
        start: start,
        limit: limit,
        is_all: true,
      });
      return {
        list: data?.history_list,
        last: data,
        totalCount: data?.total_cnt,
      };
    },
    [wallet?.openapi?.getBridgeHistoryList]
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
      reloadDeps: [isInBridge],
      isNoMore(data) {
        if (data) {
          return data?.list.length >= data?.totalCount;
        }
        return true;
      },
      manual: !isInBridge || !addr,
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
    if (!noMore && inViewport && !loadingMore && loadMore && isInBridge) {
      loadMore();
    }
  }, [inViewport, loadMore, loading, loadingMore, noMore, isInBridge]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (
      !loading &&
      !loadingMore &&
      txList?.list?.some((e) => e.status === 'pending') &&
      isInBridge
    ) {
      timer = setTimeout(refreshBridgeListTx, 2000);
    }
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [loading, loadingMore, refreshBridgeListTx, txList?.list, isInBridge]);

  return {
    loading,
    txList,
    loadingMore,
    ref,
  };
};
