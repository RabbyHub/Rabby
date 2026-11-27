import { useEffect, useState } from 'react';
import { useGasAccountSign } from './index';
import { useAsyncFn } from 'react-use';
import { useWallet } from '@/ui/utils';
import { Tx } from '@rabby-wallet/rabby-api/dist/types';
import { Account } from '@/background/service/preference';
import { useRequest } from 'ahooks';
import { getGasAccountDecision } from '@/ui/views/Approval/components/FooterBar/gasAccountDecision';
import { KEYRING_CLASS } from '@/constant';

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
