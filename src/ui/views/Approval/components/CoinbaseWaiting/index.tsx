import { useGnosisSubmission } from '@/ui/hooks/useGnosisSubmission';
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
import { useCommonPopupView, useWallet } from 'ui/utils';
import Process from './Process';
import { message } from 'antd';
import { useSessionStatus } from '@/ui/component/WalletConnect/useSessionStatus';
import { adjustV } from '@/ui/utils/gnosis';
import { findChain, findChainByEnum } from '@/utils/chain';
import { notifySigningUiReady } from '@/utils/signEvent';
import { ga4 } from '@/utils/ga4';
import { useApprovalScope } from '@/ui/approval/context';
import { useApprovalActions } from '@/ui/approval/actions';
import { useSigningAttemptEvents } from '@/ui/hooks/useSigningAttemptEvents';
import {
  requireSigningAttempt,
  sameSigningAttempt,
} from '@/utils/signingTypes';
import type { SigningAttemptRef } from '@/utils/signingTypes';

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
  const approvalScope = useApprovalScope();
  const {
    resolve: resolveApproval,
    reject: rejectApproval,
  } = useApprovalActions();
  const attemptRef = useRef<SigningAttemptRef>(
    requireSigningAttempt(approvalScope.signing?.attempt)
  );
  const getSigningContext = (attempt = attemptRef.current) => {
    const flow = approvalScope.signing?.flow;
    return flow && attempt
      ? { approval: approvalScope.approval, signing: { flow, attempt } }
      : undefined;
  };
  const signFinishedRef = useRef<((data: any) => void) | null>(null);
  const hardwareErrorRef = useRef<((message: string) => void) | null>(null);
  const gnosisSubmission = useGnosisSubmission({
    wallet,
    attemptRef,
    isGnosis: params.isGnosis,
    isMessage: !!params.safeMessage,
    signerAddress: params.account?.address || '',
    onFinished: (data) => signFinishedRef.current?.(data),
  });
  useSigningAttemptEvents(attemptRef, {
    onFinished: gnosisSubmission.onFinished,
    onHardwareError: (message) => hardwareErrorRef.current?.(message),
  });
  const mountedRef = useRef(false);

  const chain = findChain({
    id: params.chainId || 1,
  })?.enum;
  const isSignTextRef = useRef(false);
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const explainRef = useRef<any | null>(null);
  const [signFinishedData, setSignFinishedData] = useState<{
    data: any;
    signingAttempt?: SigningAttemptRef;
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
    if (await gnosisSubmission.retry()) return;
    if (!(await wallet.isApprovalCurrent(approvalScope.approval.approvalId)))
      return;
    setConnectStatus(WALLETCONNECT_STATUS_MAP.PENDING);
    setConnectError(null);
    const context = getSigningContext();
    if (!context) return;
    const attempt = await wallet.resendSign({
      retry,
      context,
    });
    if (!attempt) return;
    message.success(t('page.signFooterBar.walletConnect.requestSuccessToast'));
    attemptRef.current = attempt;
    notifySigningUiReady(attempt);
  };

  const init = async () => {
    if (!mountedRef.current) return;
    const account = params.isGnosis ? params.account! : $account;

    setCurrentAccount(account);

    let isSignTriggered = false;
    const isText = params.isGnosis
      ? true
      : approvalScope.approvalType !== 'SignTx';
    isSignTextRef.current = isText;

    const onSignFinished = async (data) => {
      const signingAttempt = data.attempt;
      if (!(await wallet.isApprovalCurrent(approvalScope.approval.approvalId)))
        return;
      if (!sameSigningAttempt(attemptRef.current, signingAttempt)) return;
      if (data.success) {
        let sig = data.data;
        setResult(sig);
        setConnectStatus(WALLETCONNECT_STATUS_MAP.SUBMITTED);
        try {
          if (params.isGnosis) {
            sig = adjustV('eth_signTypedData', sig);
            const context = getSigningContext(signingAttempt);
            if (!context) return;
            await gnosisSubmission.submit(
              params.safeMessage ? data.data : sig,
              context
            );
          }
        } catch (e) {
          if (!sameSigningAttempt(attemptRef.current, signingAttempt)) return;
          setConnectStatus(WALLETCONNECT_STATUS_MAP.FAILED);
          setConnectError({ message: e.message });
          return;
        }
        if (
          !(await wallet.isApprovalCurrent(
            approvalScope.approval.approvalId
          )) ||
          !sameSigningAttempt(attemptRef.current, signingAttempt)
        )
          return;

        setSignFinishedData({
          data: sig,
          signingAttempt: data.attempt,
        });
      } else {
        setConnectStatus(WALLETCONNECT_STATUS_MAP.FAILED);
        setConnectError({
          message: data.error,
        });
      }
    };
    signFinishedRef.current = onSignFinished;
    hardwareErrorRef.current = null;

    await initWalletConnect();
    if (!mountedRef.current) return;

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

    notifySigningUiReady(attemptRef.current);
  };

  useEffect(() => {
    mountedRef.current = true;
    init();
    setHeight('fit-content');
    return () => {
      mountedRef.current = false;
      signFinishedRef.current = null;
      hardwareErrorRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (signFinishedData && isClickDone) {
      void resolveApproval(signFinishedData.data, {
        attempt: signFinishedData.signingAttempt,
      }).then((result) => {
        if (result?.accepted) closePopup();
      });
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
