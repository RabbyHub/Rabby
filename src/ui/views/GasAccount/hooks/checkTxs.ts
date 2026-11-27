import { useEffect, useState } from 'react';
import { useGasAccountMethods, useGasAccountSign } from './index';
import { useAsyncFn, useDebounce } from 'react-use';
import { useWallet } from '@/ui/utils';
import { Tx } from '@rabby-wallet/rabby-api/dist/types';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import React from 'react';
import { Modal } from 'antd';
import clsx from 'clsx';
import { Account } from '@/background/service/preference';
import { useRequest } from 'ahooks';
import { nanoid } from 'nanoid';
import { getGasAccountDecision } from '@/ui/views/Approval/components/FooterBar/gasAccountDecision';
import { KEYRING_CLASS } from '@/constant';
import styles from './checkTxs.module.css';

export const GAS_ACCOUNT_INSUFFICIENT_TIP =
  'Gas balance is not enough for transaction';

export const useGasAccountTxsCheck = ({
  isReady,
  txs,
  noCustomRPC,
  isSupportedAddr,
  currentAccount,
}: {
  isReady: boolean;
  txs: Tx[];
  noCustomRPC: boolean;
  isSupportedAddr: boolean;
  currentAccount: Account;
}) => {
  const wallet = useWallet();
  const [gasMethod, setGasMethod] = useState<'native' | 'gasAccount'>('native');
  const { sig, accountId } = useGasAccountSign();
  const [isGasAccountLogin, setIsGasAccountLogin] = useState(
    !!sig && !!accountId
  );

  const [isFirstGasCostLoading, setIsFirstGasCostLoading] = useState(true);
  const gasAccountAddress = accountId || currentAccount.address;

  const { data: gasAccountCost, runAsync: gasAccountCostFn } = useRequest(
    async () => {
      if (!isReady) {
        return;
      }
      if (!sig || !accountId) {
        setIsGasAccountLogin(false);
      }
      const res = await wallet.openapi.checkGasAccountTxs({
        sig: sig || '',
        account_id: gasAccountAddress,
        tx_list: txs,
      });

      return res;
    },
    {
      debounceWait: 300,
      refreshDeps: [sig, accountId, isReady, txs],
      onFinally() {
        if (isReady) {
          setIsFirstGasCostLoading(false);
        }
      },
    }
  );

  const gasDecision = getGasAccountDecision({
    gasAccountCost: gasAccountCost as typeof gasAccountCost & {
      err_msg?: string;
    },
    noCustomRPC: !!noCustomRPC,
    isWalletConnect: currentAccount.type === KEYRING_CLASS.WALLETCONNECT,
    accountType: currentAccount.type,
  });

  const canUseGasAccount = isSupportedAddr && gasDecision.canUseGasAccount;

  const gasAccountCanPay = gasMethod === 'gasAccount' && canUseGasAccount;

  const canGotoUseGasAccount =
    isSupportedAddr && gasDecision.canGotoUseGasAccount;

  const canDepositUseGasAccount =
    isSupportedAddr && gasDecision.canDepositUseGasAccount;

  return {
    gasAccountCost,
    gasMethod,
    setGasMethod,
    isGasAccountLogin,
    setIsGasAccountLogin,
    gasAccountCanPay,
    canUseGasAccount,
    canGotoUseGasAccount,
    canDepositUseGasAccount,
    gasAccountCostFn,
    gasAccountAddress,
    sig,
    isFirstGasCostLoading,
  };
};

export const useLoginDepositConfirm = (params: {
  onGotoGasAccount?: () => void;
}) => {
  const { t } = useTranslation();
  const currentAccount = useCurrentAccount();
  const { login } = useGasAccountMethods();

  const history = useHistory();
  const onGotoGasAccount = params?.onGotoGasAccount;
  const gotoGasAccount = React.useCallback(() => {
    onGotoGasAccount?.();
    history.push({
      pathname: '/gas-account',
      search: `?resetKey=${nanoid()}`,
    });
  }, [onGotoGasAccount, history]);

  const modalConfirm = React.useCallback(
    (type: 'login' | 'deposit') => {
      const isLogin = type === 'login';
      const title = isLogin
        ? t('page.signFooterBar.gasAccount.loginTips')
        : t('page.signFooterBar.gasAccount.depositTips');
      Modal.confirm({
        width: 320,
        closable: false,
        centered: true,
        className: styles.depositModal,
        title: title,
        content: null,
        focusTriggerAfterClose: false,
        okButtonProps: {
          autoFocus: false,
        },
        cancelButtonProps: {
          ghost: true,
          className: clsx(
            'h-[40px] border-r-blue-default text-r-blue-default',
            'hover:bg-r-blue-light1 active:bg-r-neutral-black/10',
            'rounded-[6px]',
            'before:content-none',
            'flex items-center justify-center'
          ),
        },
        cancelText: t('global.Cancel'),
        okText: t('global.Confirm'),
        onOk() {
          if (isLogin && currentAccount) {
            login(currentAccount);
          } else {
            gotoGasAccount();
          }
        },
      });
    },
    [t, login, gotoGasAccount, currentAccount]
  );

  return modalConfirm;
};
