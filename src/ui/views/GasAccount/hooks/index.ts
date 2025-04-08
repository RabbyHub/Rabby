import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { useWallet } from '@/ui/utils';
import { useInfiniteScroll, useInViewport } from 'ahooks';
import { message } from 'antd';
import { uniqBy } from 'lodash';
import React, { useRef } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAsync } from 'react-use';
import { useGasAccountRefreshId, useGasAccountSetRefreshId } from './context';
import { preferenceService } from '@/background/service';
import { sendPersonalMessage } from '@/ui/utils/sendPersonalMessage';
import { KEYRING_CLASS } from '@/constant';
import pRetry from 'p-retry';
import { Account } from '@/background/service/preference';

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
  const currentAccount = useRabbySelector((s) => s.account.currentAccount);
  const dispatch = useRabbyDispatch();

  const { sig, accountId } = useGasAccountSign();
  const { refresh } = useGasAccountRefresh();

  const handleNoSignLogin = useCallback(
    async (account: Account) => {
      if (account) {
        const currentUseAccount = currentAccount;
        const shouldSwitchAccount =
          currentUseAccount?.address !== account.address ||
          currentUseAccount?.type !== account.type ||
          currentUseAccount?.brandName !== account.brandName;

        const resume = async () => {
          if (currentUseAccount && shouldSwitchAccount) {
            await dispatch.account.changeAccountAsync(currentUseAccount);
          }
        };
        try {
          const { text } = await wallet.openapi.getGasAccountSignText(
            account.address
          );

          if (shouldSwitchAccount) {
            await dispatch.account.changeAccountAsync(account);
          }

          const { txHash: signature } = await sendPersonalMessage({
            data: [text, account.address],
            wallet,
          });

          const result = await pRetry(
            async () =>
              wallet.openapi.loginGasAccount({
                sig: signature,
                account_id: account.address,
              }),
            {
              retries: 2,
            }
          );
          if (result?.success) {
            dispatch.gasAccount.setGasAccountSig({ sig: signature, account });
            refresh();
          }
          await resume();
        } catch (e) {
          message.error('Login in error, Please retry');
          await resume();
        }
      }
    },
    [currentAccount]
  );

  const login = useCallback(
    async (account: Account) => {
      const noSignType =
        account?.type === KEYRING_CLASS.PRIVATE_KEY ||
        account?.type === KEYRING_CLASS.MNEMONIC;
      if (noSignType) {
        handleNoSignLogin(account);
      } else {
        wallet.signGasAccount(account);
        window.close();
      }
    },
    [currentAccount, handleNoSignLogin]
  );

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
    withdrawList: History['withdraw_list'];
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
      const withdrawList = data.withdraw_list;

      return {
        rechargeList: rechargeList || [],
        withdrawList: withdrawList || [],
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
            (data.list.length || 0) +
              (data?.rechargeList?.length || 0) +
              (data?.withdrawList?.length || 0)
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

        if (
          value?.recharge_list?.length !== d.rechargeList.length ||
          value?.withdraw_list?.length !== d.withdrawList.length
        ) {
          refreshGasAccountBalance();
        }
        return {
          withdrawList: value?.withdraw_list,
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
    const hasSomePending = Boolean(
      txList?.rechargeList?.length || txList?.withdrawList?.length
    );
    if (!loading && !loadingMore && hasSomePending) {
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
