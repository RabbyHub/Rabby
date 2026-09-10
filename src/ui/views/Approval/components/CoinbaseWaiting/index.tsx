import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { matomoRequestEvent } from '@/utils/matomo-request';
import { Account } from 'background/service/preference';
import {
  CHAINS,
  WALLETCONNECT_STATUS_MAP,
  EVENTS,
  KEYRING_CATEGORY_MAP,
  CHAINS_ENUM,
} from 'consts';
import { useApproval, useCommonPopupView, useWallet } from 'ui/utils';
import Process from './Process';
import { message } from 'antd';
import { useSessionStatus } from '@/ui/component/WalletConnect/useSessionStatus';
import { findChain, findChainByEnum } from '@/utils/chain';
import { useApprovalSigning } from '@/ui/hooks/useApprovalSigning';
import { ga4 } from '@/utils/ga4';

interface ApprovalParams {
  address: string;
  chainId?: number;
  nonce?: string;
  from?: string;
  isGnosis?: boolean;
  data?: string[];
  account?: Account;
  $account: Account;
  $ctx?: any;
  extra?: Record<string, any>;
  signingTxId?: string;
  safeMessage?: {
    safeMessageHash: string;
    safeAddress: string;
    message: string;
    chainId: number;
  };
}

const CoinbaseWaiting = ({
  params,
  account: $account,
}: {
  params: ApprovalParams;
  account: Account;
}) => {
  const { setHeight, setVisible, closePopup } = useCommonPopupView();
  const wallet = useWallet();
  const [connectStatus, setConnectStatus] = useState(
    WALLETCONNECT_STATUS_MAP.WAITING
  );
  const [connectError, setConnectError] = useState<null | {
    code?: number;
    message?: string;
  }>(null);
  const [result, setResult] = useState('');
  const [getApproval, resolveApproval, rejectApproval] = useApproval();

  const chain = findChain({
    id: params.chainId || 1,
  })?.enum;
  const isSignTextRef = useRef(false);
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const explainRef = useRef<any | null>(null);
  const [signFinishedData, setSignFinishedData] = useState<{
    data: any;
  }>();
  const [isClickDone, setIsClickDone] = useState(false);
  const { status: sessionStatus } = useSessionStatus(currentAccount!);
  const { t } = useTranslation();

  const initWalletConnect = async () => {
    const account = params.isGnosis ? params.account! : $account;
    const status = await wallet.getWalletConnectStatus(
      account.address,
      account.brandName
    );
    if (status) {
      setConnectStatus(
        status === null ? WALLETCONNECT_STATUS_MAP.PENDING : status
      );
    }

    const signingTx = await wallet.getSigningTx(params.signingTxId!);

    explainRef.current = signingTx?.explain;
  };

  const handleCancel = () => {
    rejectApproval('user cancel');
  };

  const handleRetry = async (retry?: boolean) => {
    setConnectStatus(WALLETCONNECT_STATUS_MAP.PENDING);
    setConnectError(null);
    if (!(await startSigning({ type: 'origin' }))) return;
    message.success(t('page.signFooterBar.walletConnect.requestSuccessToast'));
  };

  const startSigning = useApprovalSigning({
    onResult: async (data) => {
      if (!data.success && data.errorStage === 'gnosis') {
        rejectApproval(data.errorMsg);
        return;
      }
      if (data.success) {
        const sig = data.data;
        setResult(sig);
        setConnectStatus(WALLETCONNECT_STATUS_MAP.SUBMITTED);
        setSignFinishedData({
          data: sig,
        });
      } else {
        setConnectStatus(WALLETCONNECT_STATUS_MAP.FAILED);
        setConnectError({
          message: data.errorMsg,
        });
      }
    },
  });

  const init = async () => {
    const approval = await getApproval();
    if (!approval) return;
    const account = params.isGnosis ? params.account! : $account;

    setCurrentAccount(account);

    let isSignTriggered = false;
    const isText = params.isGnosis
      ? true
      : approval?.data.approvalType !== 'SignTx';
    isSignTextRef.current = isText;

    await initWalletConnect();

    if (!isText && !isSignTriggered) {
      const explain = explainRef.current;
      const chainInfo = findChainByEnum(chain);

      if (explain || chainInfo?.isTestnet) {
        wallet.reportStats('signTransaction', {
          type: account.brandName,
          chainId: chainInfo?.serverId || '',
          category: KEYRING_CATEGORY_MAP[account.type],
          preExecSuccess: explain
            ? explain?.calcSuccess && explain?.pre_exec.success
            : true,
          createdBy: params?.$ctx?.ga ? 'rabby' : 'dapp',
          source: params?.$ctx?.ga?.source || '',
          trigger: params?.$ctx?.ga?.trigger || '',
          networkType: chainInfo?.isTestnet
            ? 'Custom Network'
            : 'Integrated Network',
        });
      }
      matomoRequestEvent({
        category: 'Transaction',
        action: 'Submit',
        label: chainInfo?.isTestnet ? 'Custom Network' : 'Integrated Network',
      });

      ga4.fireEvent(
        `Submit_${chainInfo?.isTestnet ? 'Custom' : 'Integrated'}`,
        {
          event_category: 'Transaction',
        }
      );

      isSignTriggered = true;
    }
    if (isText && !isSignTriggered) {
      wallet.reportStats('startSignText', {
        type: account.brandName,
        category: KEYRING_CATEGORY_MAP[account.type],
        method: params?.extra?.signTextMethod,
      });
      isSignTriggered = true;
    }

    startSigning();
  };

  useEffect(() => {
    init();
    setHeight('fit-content');
  }, []);

  useEffect(() => {
    if (signFinishedData && isClickDone) {
      closePopup();
      resolveApproval(signFinishedData.data, false, false);
    }
  }, [signFinishedData, isClickDone]);

  useEffect(() => {
    if (sessionStatus === 'DISCONNECTED') {
      setVisible(false);
      message.error(t('page.signFooterBar.ledger.notConnected'));
    }
  }, [sessionStatus]);

  return (
    <div className="watchaddress">
      <div className="watchaddress-operation">
        {currentAccount && (
          <Process
            chain={chain || CHAINS_ENUM.ETH}
            result={result}
            status={connectStatus}
            error={connectError}
            onRetry={handleRetry}
            onCancel={handleCancel}
            account={currentAccount}
            onDone={() => setIsClickDone(true)}
            chainId={params?.chainId}
            nonce={params?.nonce}
            from={params?.from}
          />
        )}
      </div>
    </div>
  );
};

export default CoinbaseWaiting;
