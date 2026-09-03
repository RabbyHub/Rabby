import React from 'react';
import { message } from 'antd';
import { useTranslation } from 'react-i18next';
import { matomoRequestEvent } from '@/utils/matomo-request';
import { Account } from 'background/service/preference';
import {
  CHAINS,
  WALLETCONNECT_STATUS_MAP,
  EVENTS,
  KEYRING_CLASS,
  KEYRING_CATEGORY_MAP,
} from 'consts';
import {
  openInTab,
  openInternalPageInTab,
  useWallet,
  useCommonPopupView,
} from 'ui/utils';
import { adjustV } from 'ui/utils/gnosis';
import eventBus from '@/eventBus';
import stats from '@/stats';
import ImKeySVG from 'ui/assets/walletlogo/imkey.svg';
import {
  ApprovalPopupContainer,
  Props as ApprovalPopupContainerProps,
} from './Popup/ApprovalPopupContainer';
import { useImKeyStatus } from '@/ui/component/ConnectStatus/useImKeyStatus';
import * as Sentry from '@sentry/browser';
import { findChain } from '@/utils/chain';
import { notifySigningUiReady } from '@/utils/signEvent';
import type { SigningAttempt } from '@/utils/signEvent';
import { ga4 } from '@/utils/ga4';
import { useGetTxFailedResultInWaiting } from '@/ui/hooks/useMiniApprovalDirectSign';
import { useApprovalScope } from '@/ui/approval/context';
import { useApprovalActions } from '@/ui/approval/actions';
import { useSigningAttemptEvents } from '@/ui/hooks/useSigningAttemptEvents';
import { requireSigningAttempt } from '@/utils/signingTypes';

interface ApprovalParams {
  address: string;
  chainId?: number;
  from?: string;
  nonce?: string;
  isGnosis?: boolean;
  data?: string[];
  account?: Account;
  $ctx?: any;
  extra?: Record<string, any>;
  safeMessage?: {
    safeMessageHash: string;
    safeAddress: string;
    message: string;
    chainId: number;
  };
  stay?: boolean;
}

export const ImKeyHardwareWaiting = ({
  params,
  account: $account,
}: {
  params: ApprovalParams;
  account: Account;
}) => {
  const {
    setHeight,
    setTitle,
    setVisible,
    closePopup,
    setPopupProps,
  } = useCommonPopupView();
  const [statusProp, setStatusProp] = React.useState<
    ApprovalPopupContainerProps['status']
  >('SENDING');
  const [content, setContent] = React.useState('');
  const [description, setDescription] = React.useState('');
  const wallet = useWallet();

  const [connectStatus, setConnectStatus] = React.useState(
    WALLETCONNECT_STATUS_MAP.WAITING
  );
  const approvalScope = useApprovalScope();
  const {
    resolve: resolveApproval,
    reject: rejectApproval,
  } = useApprovalActions();
  const attemptRef = React.useRef<SigningAttempt>(
    requireSigningAttempt(approvalScope.signing?.attempt)
  );
  const getSigningContext = (attempt = attemptRef.current) => {
    const flow = approvalScope.signing?.flow;
    return flow && attempt
      ? { approval: approvalScope.approval, signing: { flow, attempt } }
      : undefined;
  };
  const handlersRef = React.useRef<{
    onFinished?: (data: any) => void;
    onHardwareError?: (message: string) => void;
    onSubmitting?: () => void;
  }>({});
  useSigningAttemptEvents(attemptRef, {
    onFinished: (data) => handlersRef.current.onFinished?.(data),
    onHardwareError: (message) =>
      handlersRef.current.onHardwareError?.(message),
    onSubmitting: () => handlersRef.current.onSubmitting?.(),
  });
  const chain = findChain({
    id: params.chainId || 1,
  });
  const { t } = useTranslation();
  const [isSignText, setIsSignText] = React.useState(false);
  const [result, setResult] = React.useState('');
  const [errorMessage, setErrorMessage] = React.useState('');
  const [isClickDone, setIsClickDone] = React.useState(false);
  const [signFinishedData, setSignFinishedData] = React.useState<{
    data: any;
    signingAttempt?: SigningAttempt;
  }>();
  const { status: sessionStatus } = useImKeyStatus();
  const firstConnectRef = React.useRef<boolean>(false);
  const mountedRef = React.useRef(false);
  const showDueToStatusChangeRef = React.useRef(false);
  const listenersCleanupRef = React.useRef<(() => void) | null>(null);

  const handleCancel = () => {
    rejectApproval('user cancel');
  };

  const handleRetry = async (showToast = true) => {
    if (connectStatus === WALLETCONNECT_STATUS_MAP.SUBMITTING) {
      message.success(t('page.signFooterBar.ledger.resubmited'));
      return;
    }
    if (sessionStatus === 'DISCONNECTED') return;
    if (!(await wallet.isApprovalCurrent(approvalScope.approval.approvalId)))
      return;
    setConnectStatus(WALLETCONNECT_STATUS_MAP.WAITING);
    const autoRetryUpdate =
      !!txFailedResult?.[1] && txFailedResult?.[1] !== 'origin';
    const context = getSigningContext();
    if (!context) return;
    if (!(await wallet.setRetryTxType(txFailedResult?.[1] || false, context))) {
      return;
    }
    if (!(await wallet.isApprovalCurrent(approvalScope.approval.approvalId)))
      return;
    const attempt = await wallet.resendSign({
      retry: autoRetryUpdate,
      context,
    });
    if (!attempt) return;
    if (showToast) {
      message.success(t('page.signFooterBar.ledger.resent'));
    }
    if (attempt) {
      attemptRef.current = attempt;
      notifySigningUiReady(attempt);
    }
  };

  // const handleClickResult = () => {
  //   const url = chain.scanLink.replace(/_s_/, result);
  //   openInTab(url);
  // };

  const init = async () => {
    const account = params.isGnosis ? params.account! : $account;
    const approval = {
      id: approvalScope.approval.approvalId,
      data: {
        approvalComponent: approvalScope.approval.component,
        approvalType: approvalScope.approvalType,
        params: approvalScope.params,
        account: approvalScope.account,
        signing: approvalScope.signing,
      },
    } as any;
    if (!mountedRef.current || !approval) return;
    if (approval.data.signing?.attempt) {
      attemptRef.current = approval.data.signing.attempt;
    }

    const isSignText = params.isGnosis
      ? true
      : approval?.data.approvalType !== 'SignTx';
    setIsSignText(isSignText);
    if (!isSignText) {
      const signingTxId = approval.data.params.signingTxId;
      // const tx = approval.data?.params;
      if (signingTxId) {
        // const { nonce, from, chainId } = tx;
        // const explain = await wallet.getExplainCache({
        //   nonce: Number(nonce),
        //   address: from,
        //   chainId: Number(chainId),
        // });

        const signingTx = await wallet.getSigningTx(signingTxId);
        if (!mountedRef.current) return;

        if (!signingTx?.explain && chain && !chain.isTestnet) {
          setErrorMessage(t('page.signFooterBar.qrcode.failedToGetExplain'));
          return;
        }

        const explain = signingTx?.explain;

        wallet.reportStats('signTransaction', {
          type: account.brandName,
          chainId: chain?.serverId || '',
          category: KEYRING_CATEGORY_MAP[account.type],
          preExecSuccess: explain
            ? explain?.calcSuccess && explain?.pre_exec.success
            : true,
          createdBy: params?.$ctx?.ga ? 'rabby' : 'dapp',
          source: params?.$ctx?.ga?.source || '',
          trigger: params?.$ctx?.ga?.trigger || '',
          networkType: chain?.isTestnet
            ? 'Custom Network'
            : 'Integrated Network',
        });
      }
    } else {
      stats.report('startSignText', {
        type: account.brandName,
        category: KEYRING_CATEGORY_MAP[account.type],
        method: params?.extra?.signTextMethod,
      });
    }

    const onHardwareRejected = async (errorMessage: string) => {
      if (!(await wallet.isApprovalCurrent(approval.id))) return;
      if (!errorMessage) return;
      setErrorMessage(errorMessage);
      if (/DisconnectedDeviceDuringOperation/i.test(errorMessage)) {
        const result = await rejectApproval('User rejected the request.');
        if (!result?.accepted) return;
        openInternalPageInTab('request-permission?type=imkey&from=approval');
      }
      setConnectStatus(WALLETCONNECT_STATUS_MAP.REJECTED);
    };
    const onTxSubmitting = async () => {
      if (!(await wallet.isApprovalCurrent(approval.id))) return;
      setConnectStatus(WALLETCONNECT_STATUS_MAP.SUBMITTING);
    };
    const onSignFinished = async (data) => {
      if (!(await wallet.isApprovalCurrent(approval.id))) return;
      const signingAttempt = data.attempt;
      if (data.success) {
        let sig = data.data;
        setResult(sig);
        setConnectStatus(WALLETCONNECT_STATUS_MAP.SUBMITTED);
        try {
          if (params.isGnosis) {
            sig = adjustV('eth_signTypedData', sig);
            const context = getSigningContext(signingAttempt);
            if (!context) return;
            const safeMessage = params.safeMessage;
            if (safeMessage) {
              await wallet.handleGnosisMessage({
                signature: data.data,
                signerAddress: params.account!.address!,
                context,
              });
            } else {
              const sigs = await wallet.getGnosisTransactionSignatures();
              if (sigs.length > 0) {
                await wallet.gnosisAddConfirmation(
                  account.address,
                  sig,
                  context
                );
              } else {
                await wallet.gnosisAddSignature(account.address, sig, context);
                await wallet.postGnosisTransaction(context);
              }
            }
          }
        } catch (e) {
          Sentry.captureException(e);
          setConnectStatus(WALLETCONNECT_STATUS_MAP.FAILED);
          return;
        }
        if (!(await wallet.isApprovalCurrent(approval.id))) return;
        matomoRequestEvent({
          category: 'Transaction',
          action: 'Submit',
          label: chain?.isTestnet ? 'Custom Network' : 'Integrated Network',
        });

        ga4.fireEvent(`Submit_${chain?.isTestnet ? 'Custom' : 'Integrated'}`, {
          event_category: 'Transaction',
        });

        setSignFinishedData({
          data: sig,
          signingAttempt: data.attempt,
        });
      } else {
        Sentry.captureException(
          new Error('imKey sign error: ' + JSON.stringify(data))
        );
        setConnectStatus(WALLETCONNECT_STATUS_MAP.FAILED);
        setErrorMessage(data.errorMsg);
      }
    };
    handlersRef.current = {
      onFinished: onSignFinished,
      onHardwareError: onHardwareRejected,
      onSubmitting: onTxSubmitting,
    };
    listenersCleanupRef.current = () => {
      handlersRef.current = {};
    };

    const attempt = approvalScope.signing?.attempt;
    if (attempt) {
      attemptRef.current = attempt;
      notifySigningUiReady(attempt);
    }
  };

  React.useEffect(() => {
    if (firstConnectRef.current) {
      if (sessionStatus === 'DISCONNECTED') {
        setVisible(false);
        message.error(t('page.signFooterBar.ledger.notConnected'));
      }
    }

    if (sessionStatus === 'CONNECTED') {
      firstConnectRef.current = true;
    }
  }, [sessionStatus]);

  React.useEffect(() => {
    mountedRef.current = true;
    setTitle(
      <div className="flex justify-center items-center">
        <img src={ImKeySVG} className="w-20 mr-8" />
        <span>
          {t('page.signFooterBar.qrcode.signWith', { brand: 'imKey' })}
        </span>
      </div>
    );
    setHeight('fit-content');
    init();
    return () => {
      mountedRef.current = false;
      listenersCleanupRef.current?.();
      listenersCleanupRef.current = null;
    };
  }, []);

  React.useEffect(() => {
    setPopupProps(params?.extra?.popupProps);
  }, [params?.extra?.popupProps]);

  // React.useEffect(() => {
  //   if (visible && mountedRef.current && !showDueToStatusChangeRef.current) {
  //     console.log('handle retry');
  //     handleRetry(false);
  //   }
  //   showDueToStatusChangeRef.current = false;
  // }, [visible]);

  const { stay = false } = params || {};
  React.useEffect(() => {
    if (signFinishedData && isClickDone) {
      void resolveApproval(signFinishedData.data, {
        stay,
        attempt: signFinishedData.signingAttempt,
      }).then((result) => {
        if (result?.accepted) closePopup();
      });
    }
  }, [signFinishedData, isClickDone]);

  React.useEffect(() => {
    setVisible(true);
    showDueToStatusChangeRef.current = true;
    switch (connectStatus) {
      case WALLETCONNECT_STATUS_MAP.WAITING:
        setStatusProp('SENDING');
        setContent(t('page.signFooterBar.ledger.siging'));
        setDescription('');
        break;
      case WALLETCONNECT_STATUS_MAP.SUBMITTING:
        setStatusProp('SENDING');
        setContent(t('page.signFooterBar.ledger.submitting'));
        setDescription('');
        break;
      case WALLETCONNECT_STATUS_MAP.REJECTED:
        setStatusProp('REJECTED');
        setContent(t('page.signFooterBar.qrcode.txFailed'));
        setDescription(errorMessage);
        break;
      case WALLETCONNECT_STATUS_MAP.FAILED:
        setStatusProp('FAILED');
        setContent(t('page.signFooterBar.qrcode.txFailed'));
        setDescription(errorMessage);
        break;
      case WALLETCONNECT_STATUS_MAP.SUBMITTED:
        setStatusProp('RESOLVED');
        setContent(t('page.signFooterBar.qrcode.sigCompleted'));
        setDescription('');
        break;
      default:
        break;
    }
  }, [connectStatus, errorMessage]);

  const currentDescription = React.useMemo(() => {
    return description;
  }, [description]);

  const { value: txFailedResult } = useGetTxFailedResultInWaiting({
    nonce: params?.nonce,
    chainId: params?.chainId,
    status: connectStatus,
    from: params.from,
    description: description,
  });

  React.useEffect(() => {
    if (
      [
        WALLETCONNECT_STATUS_MAP.FAILED,
        WALLETCONNECT_STATUS_MAP.REJECTED,
      ].includes(connectStatus)
    ) {
      setContent(
        txFailedResult?.[1]
          ? t('page.signFooterBar.qrcode.txFailedRetry')
          : t('page.signFooterBar.qrcode.txFailed')
      );
    }
  }, [txFailedResult?.[1], connectStatus]);

  return (
    <ApprovalPopupContainer
      showAnimation
      hdType="wired"
      status={statusProp}
      onRetry={() => handleRetry()}
      onDone={() => setIsClickDone(true)}
      onCancel={handleCancel}
      description={txFailedResult?.[0] || currentDescription}
      retryUpdateType={txFailedResult?.[1] ?? 'origin'}
      content={content}
      hasMoreDescription={statusProp === 'REJECTED' || statusProp === 'FAILED'}
    />
  );
};
