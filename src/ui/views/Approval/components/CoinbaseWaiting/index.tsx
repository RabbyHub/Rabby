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
import eventBus from '@/eventBus';
import Process from './Process';
import { message } from 'antd';
import { useSessionStatus } from '@/ui/component/WalletConnect/useSessionStatus';
import { adjustV } from '@/ui/utils/gnosis';
import { findChain, findChainByEnum } from '@/utils/chain';
import { emitSignComponentAmounted } from '@/utils/signEvent';
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
    approvalId: string;
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
    await wallet.resendSign(retry);
    message.success(t('page.signFooterBar.walletConnect.requestSuccessToast'));
    emitSignComponentAmounted();
  };

  const init = async () => {
    const approval = await getApproval();
    const account = params.isGnosis ? params.account! : $account;

    setCurrentAccount(account);

    let isSignTriggered = false;
    const isText = params.isGnosis
      ? true
      : approval?.data.approvalType !== 'SignTx';
    isSignTextRef.current = isText;

    eventBus.addEventListener(EVENTS.SIGN_FINISHED, async (data) => {
      if (data.success) {
        let sig = data.data;
        setResult(sig);
        setConnectStatus(WALLETCONNECT_STATUS_MAP.SUBMITTED);
        try {
          if (params.isGnosis) {
            sig = adjustV('eth_signTypedData', sig);
            const safeMessage = params.safeMessage;
            if (safeMessage) {
              await wallet.handleGnosisMessage({
                signature: data.data,
                signerAddress: params.account!.address!,
              });
            } else {
              const sigs = await wallet.getGnosisTransactionSignatures();
              if (sigs.length > 0) {
                await wallet.gnosisAddConfirmation(account.address, sig);
              } else {
                await wallet.gnosisAddSignature(account.address, sig);
                await wallet.postGnosisTransaction();
              }
            }
          }
        } catch (e) {
          rejectApproval(e.message);
          return;
        }

        setSignFinishedData({
          data: sig,
          approvalId: approval.id,
        });
      } else {
        setConnectStatus(WALLETCONNECT_STATUS_MAP.FAILED);
        setConnectError({
          message: data.errorMsg,
        });
      }
    });

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

    emitSignComponentAmounted();
  };

  useEffect(() => {
    init();
    setHeight('fit-content');
  }, []);

  useEffect(() => {
    if (signFinishedData && isClickDone) {
      closePopup();
      resolveApproval(
        signFinishedData.data,
        false,
        false,
        signFinishedData.approvalId
      );
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
