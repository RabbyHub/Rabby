import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { useWallet } from '@/ui/utils';
import { useInfiniteScroll, useInViewport } from 'ahooks';
import { message } from 'antd';
import { uniqBy } from 'lodash';
import React, { useRef } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAsync } from 'react-use';
import { useGasAccountRefreshId, useGasAccountSetRefreshId } from './context';

export const useGasAccountRefresh = () => {
  const refreshId = useGasAccountRefreshId();
  const setRefreshId = useGasAccountSetRefreshId();

  const refresh = () => setRefreshId((e) => e + 1);

  return { refreshId, refresh };
};

export const useGasAccountSign = () => {
  const sig = useRabbySelector((s) => s.gasAccount.sig);
  const accountId = useRabbySelector((s) => s.gasAccount.accountId);

  return { sig, accountId };
};

export const useGasAccountInfo = () => {
  const wallet = useWallet();

  const { sig, accountId } = useGasAccountSign();
  const dispatch = useRabbyDispatch();

  const { refreshId } = useGasAccountRefresh();

  const { value, loading, error } = useAsync(async () => {
    if (!sig || !accountId) return undefined;
    return wallet.openapi
      .getGasAccountInfo({ sig, id: accountId })
      .then((e) => {
        if (e.account.id) {
          return e;
        }
        dispatch.gasAccount.setGasAccountSig({});
        return undefined;
      });
  }, [sig, accountId, refreshId]);

  if (
    error?.message?.includes('gas account verified failed') &&
    sig &&
    accountId
  ) {
    dispatch.gasAccount.setGasAccountSig({});
  }

  return { loading, value };
};

export const useGasAccountMethods = () => {
  const wallet = useWallet();
  const dispatch = useRabbyDispatch();

  const { sig, accountId } = useGasAccountSign();

  const login = useCallback(async () => {
    wallet.signGasAccount();
    window.close();
  }, []);

  const logout = useCallback(async () => {
    if (sig && accountId) {
      const result = await wallet.openapi.logoutGasAccount({
        sig,
        account_id: accountId,
      });
      if (result.success) {
        dispatch.gasAccount.setGasAccountSig({});
      } else {
        message.error('please retry');
      }
    }
  }, []);

  return { login, logout };
};

export const useGasAccountLogin = ({
  loading,
  value,
}: ReturnType<typeof useGasAccountInfo>) => {
  const { sig, accountId } = useGasAccountSign();

  const { login, logout } = useGasAccountMethods();

  const isLogin = useMemo(
    () => (!loading ? !!value?.account?.id : !!sig && !!accountId),
    [sig, accountId, loading, value?.account?.id]
  );

  return { login, logout, isLogin };
};

export const useGasAccountHistory = () => {
  const { sig, accountId } = useGasAccountSign();

  const wallet = useWallet();

  const [refreshTxListCount, setRefreshListTx] = useState(0);
  const refreshListTx = React.useCallback(() => {
    setRefreshListTx((e) => e + 1);
  }, []);

  const { refresh: refreshGasAccountBalance } = useGasAccountRefresh();

  type History = Awaited<
    ReturnType<typeof wallet.openapi.getGasAccountHistory>
  >;

  const {
    data: txList,
    loading,
    loadMore,
    loadingMore,
    noMore,
    mutate,
  } = useInfiniteScroll<{
    rechargeList: History['recharge_list'];
    list: History['history_list'];
    totalCount: number;
  }>(
    async (d) => {
      const data = await wallet.openapi.getGasAccountHistory({
        sig: sig!,
        account_id: accountId!,
        start: d?.list?.length && d?.list?.length > 1 ? d?.list?.length : 0,
        limit: 5,
      });

      const rechargeList = data.recharge_list;
      const historyList = data.history_list;

      return {
        rechargeList: rechargeList || [],
        list: historyList,
        totalCount: data.pagination.total,
      };
    },

    {
      reloadDeps: [sig],
      isNoMore(data) {
        if (data) {
          return (
            data.totalCount <=
            (data.list.length || 0) + (data?.rechargeList?.length || 0)
          );
        }
        return true;
      },
      manual: !sig || !accountId,
    }
  );

  const { value } = useAsync(async () => {
    if (sig && accountId && refreshTxListCount) {
      return wallet.openapi.getGasAccountHistory({
        sig,
        account_id: accountId,
        start: 0,
        limit: 5,
      });
    }
  }, [sig, refreshTxListCount]);

  useEffect(() => {
    if (value?.history_list) {
      mutate((d) => {
        if (!d) {
          return;
        }

        if (value?.recharge_list?.length !== d.rechargeList.length) {
          refreshGasAccountBalance();
        }
        return {
          rechargeList: value?.recharge_list,
          totalCount: value.pagination.total,
          list: uniqBy(
            [...(value?.history_list || []), ...(d?.list || [])],
            (e) => `${e.chain_id}${e.tx_id}` as string
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
    if (!loading && !loadingMore && !!txList?.rechargeList?.length) {
      timer = setTimeout(refreshListTx, 2000);
    }
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [loading, loadingMore, refreshListTx, txList]);

  return {
    loading,
    txList,
    loadingMore,
    ref,
  };
};

export const useAml = () => {
  const { accountId } = useGasAccountSign();
  const wallet = useWallet();

  const { value } = useAsync(async () => {
    if (accountId) {
      return wallet.openapi.getGasAccountAml(accountId);
    }
    return {
      is_risk: false,
    };
  }, [accountId]);

  return value?.is_risk;
};
