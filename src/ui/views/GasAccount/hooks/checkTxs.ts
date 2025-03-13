import { useEffect, useState } from 'react';
import { useGasAccountMethods, useGasAccountSign } from './index';
import { useAsyncFn, useCss, useDebounce } from 'react-use';
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
      refreshDeps: [sig, accountId, isReady, txs],
      onFinally() {
        if (isReady) {
          setIsFirstGasCostLoading(false);
        }
      },
    }
  );
  useDebounce(
    () => {
      gasAccountCostFn();
    },
    300,
    [sig, accountId, isReady, txs]
  );

  const gasAccountCanPay =
    gasMethod === 'gasAccount' &&
    isSupportedAddr &&
    noCustomRPC &&
    !!gasAccountCost?.balance_is_enough &&
    !gasAccountCost.chain_not_support &&
    !!gasAccountCost.is_gas_account;

  const canGotoUseGasAccount =
    isSupportedAddr &&
    noCustomRPC &&
    !!gasAccountCost?.balance_is_enough &&
    !gasAccountCost.chain_not_support &&
    !!gasAccountCost.is_gas_account;

  const canDepositUseGasAccount =
    isGasAccountLogin &&
    isSupportedAddr &&
    noCustomRPC &&
    gasAccountCost &&
    !gasAccountCost?.balance_is_enough &&
    !gasAccountCost.chain_not_support;

  return {
    gasAccountCost,
    gasMethod,
    setGasMethod,
    isGasAccountLogin,
    setIsGasAccountLogin,
    gasAccountCanPay,
    canGotoUseGasAccount,
    canDepositUseGasAccount,
    gasAccountCostFn,
    gasAccountAddress,
    sig,
    isFirstGasCostLoading,
  };
};

export const useLoginDepositConfirm = () => {
  const { t } = useTranslation();
  const currentAccount = useCurrentAccount();
  const { login } = useGasAccountMethods();

  const history = useHistory();
  const gotoGasAccount = React.useCallback(() => {
    history.push('/gas-account');
  }, []);

  const depositCn = useCss({
    '& .ant-modal-content': {
      background: 'var(--r-neutral-bg1, #FFF)',
      borderRadius: '16px',
    },
    '& .ant-modal-confirm-title': {
      color: 'var(--r-neutral-title1, #192945)',
      textAlign: 'center',
      fontSize: '15px',
      fontStyle: 'normal',
      fontWeight: 500,
      lineHeight: 'normal',
    },
    '& .ant-modal-body': {
      padding: '24px 16px 20px 16px',
    },
    '& .ant-modal-confirm-content': {
      padding: '4px 0 0 0',
    },
    '& .ant-modal-confirm-btns': {
      justifyContent: 'center',
      '.ant-btn-primary': {
        width: '260px',
        height: '40px',
      },
    },
  });

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
        className: depositCn,
        title: title,
        content: null,
        focusTriggerAfterClose: false,
        okButtonProps: {
          autoFocus: false,
        },
        cancelButtonProps: {
          ghost: true,
          className: clsx(
            'h-[40px] border-blue-light text-blue-light',
            'hover:bg-r-blue-light1 active:bg-[#0000001A]',
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
    [t, depositCn, login, gotoGasAccount]
  );

  return modalConfirm;
};
