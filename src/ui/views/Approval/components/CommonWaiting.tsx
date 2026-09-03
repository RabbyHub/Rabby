import React from 'react';
import { useTranslation } from 'react-i18next';
import { openInternalPageInTab, useCommonPopupView, useWallet } from 'ui/utils';
import {
  CHAINS,
  EVENTS,
  HARDWARE_KEYRING_TYPES,
  KEYRING_CATEGORY_MAP,
  WALLETCONNECT_STATUS_MAP,
  WALLET_BRAND_CONTENT,
  WALLET_BRAND_TYPES,
} from 'consts';
import {
  ApprovalPopupContainer,
  Props as ApprovalPopupContainerProps,
} from './Popup/ApprovalPopupContainer';
import { Account } from 'background/service/preference';
import stats from '@/stats';
import eventBus from '@/eventBus';
import { matomoRequestEvent } from '@/utils/matomo-request';
import { adjustV } from '@/ui/utils/gnosis';
import { message } from 'antd';
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
  from?: string;
  nonce?: string;
  address: string;
  chainId?: number;
  isGnosis?: boolean;
  data?: string[];
  account?: Account;
  $ctx?: any;
  extra?: Record<string, any>;
  type: string;
  safeMessage?: {
    safeMessageHash: string;
    safeAddress: string;
    message: string;
    chainId: number;
  };
  stay?: boolean;
}

export const CommonWaiting = ({
  params,
  account: $account,
}: {
  params: ApprovalParams;
  account: Account;
}) => {
  const wallet = useWallet();
  const {
    setHeight,
    setTitle,
    setVisible,
    closePopup,
    setPopupProps,
  } = useCommonPopupView();
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
  const mountedRef = React.useRef(false);
  const listenersCleanupRef = React.useRef<(() => void) | null>(null);
  const { t } = useTranslation();
  const { type } = params;
  const { brandName } = Object.keys(HARDWARE_KEYRING_TYPES)
    .map((key) => HARDWARE_KEYRING_TYPES[key])
    .find((item) => item.type === type);
  const [errorMessage, setErrorMessage] = React.useState('');
  const chain = findChain({
    id: params.chainId || 1,
  });
  const [connectStatus, setConnectStatus] = React.useState(
    WALLETCONNECT_STATUS_MAP.WAITING
  );
  const [result, setResult] = React.useState('');
  const [isClickDone, setIsClickDone] = React.useState(false);
  const [signFinishedData, setSignFinishedData] = React.useState<{
    data: any;
    signingAttempt?: SigningAttempt;
  }>();
  const [statusProp, setStatusProp] = React.useState<
    ApprovalPopupContainerProps['status']
  >('SENDING');
  const [content, setContent] = React.useState('');
  const [description, setDescription] = React.useState('');

  const handleRetry = async () => {
    if (connectStatus === WALLETCONNECT_STATUS_MAP.SUBMITTING) {
      message.success(t('page.signFooterBar.ledger.resubmited'));
      return;
    }
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

    message.success(t('page.signFooterBar.ledger.resent'));
    if (attempt) {
      attemptRef.current = attempt;
      notifySigningUiReady(attempt);
    }
  };

  const handleCancel = () => {
    rejectApproval('user cancel');
  };

  const brandContent = React.useMemo(() => {
    switch (brandName) {
      case HARDWARE_KEYRING_TYPES.BitBox02.brandName:
        return WALLET_BRAND_CONTENT.BITBOX02;
      case HARDWARE_KEYRING_TYPES.GridPlus.brandName:
        return WALLET_BRAND_CONTENT.GRIDPLUS;
      case HARDWARE_KEYRING_TYPES.Onekey.brandName:
        return WALLET_BRAND_CONTENT.ONEKEY;
      case HARDWARE_KEYRING_TYPES.Trezor.brandName:
        return WALLET_BRAND_CONTENT.TREZOR;
      default:
        break;
    }
  }, [brandName]);

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
    if (!isSignText) {
      const signingTxId = approval.data.params.signingTxId;
      if (signingTxId) {
        const signingTx = await wallet.getSigningTx(signingTxId);
        if (!mountedRef.current) return;

        if (!signingTx?.explain && chain && !chain?.isTestnet) {
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
      setConnectStatus(WALLETCONNECT_STATUS_MAP.FAILED);
    };

    const onOneKeyPermission = async (data) => {
      if (!(await wallet.isApprovalCurrent(approval.id))) return;
      openInternalPageInTab('request-permission?type=onekey&from=approval');
    };

    const onTxSubmitting = async () => {
      if (!(await wallet.isApprovalCurrent(approval.id))) return;
      setConnectStatus(WALLETCONNECT_STATUS_MAP.SUBMITTING);
    };
    eventBus.addEventListener(
      EVENTS.ONEKEY.REQUEST_PERMISSION_WEBUSB,
      onOneKeyPermission
    );
    const onSignFinished = async (data) => {
      console.log('finished', data);
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
                  data.data,
                  context
                );
              } else {
                await wallet.gnosisAddSignature(
                  account.address,
                  data.data,
                  context
                );
                await wallet.postGnosisTransaction(context);
              }
            }
          }
        } catch (e) {
          setConnectStatus(WALLETCONNECT_STATUS_MAP.FAILED);
          setErrorMessage(e.message);
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
          signingAttempt,
        });
      } else {
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
      eventBus.removeEventListener(
        EVENTS.ONEKEY.REQUEST_PERMISSION_WEBUSB,
        onOneKeyPermission
      );
      handlersRef.current = {};
    };

    const attempt = approvalScope.signing?.attempt;
    if (attempt) {
      attemptRef.current = attempt;
      notifySigningUiReady(attempt);
    }
  };

  React.useEffect(() => {
    mountedRef.current = true;
    (async () => {
      const account = params.isGnosis ? params.account! : $account;
      setTitle(
        <div className="flex justify-center items-center">
          <img src={brandContent?.icon} className="w-20 mr-8" />
          <span>
            {t('page.signFooterBar.qrcode.signWith', {
              brand: account.brandName,
            })}
          </span>
        </div>
      );
      setHeight('fit-content');
      init();
    })();
    return () => {
      mountedRef.current = false;
      listenersCleanupRef.current?.();
      listenersCleanupRef.current = null;
    };
  }, []);

  React.useEffect(() => {
    setPopupProps(params?.extra?.popupProps);
  }, [params?.extra?.popupProps]);

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
      case WALLETCONNECT_STATUS_MAP.FAILED:
        setStatusProp('REJECTED');
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

  const hdType = React.useMemo(() => {
    switch (brandContent?.brand) {
      case WALLET_BRAND_TYPES.GRIDPLUS:
        return 'wireless';

      default:
        return 'wired';
    }
  }, [brandContent?.brand]);

  const { value: txFailedResult } = useGetTxFailedResultInWaiting({
    nonce: params?.nonce,
    chainId: params?.chainId,
    from: params?.from,
    status: connectStatus,
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

  if (!brandContent) {
    throw new Error(t('page.signFooterBar.common.notSupport', [brandName]));
  }

  return (
    <ApprovalPopupContainer
      showAnimation
      hdType={hdType}
      status={statusProp}
      onRetry={handleRetry}
      content={content}
      onDone={() => setIsClickDone(true)}
      onCancel={handleCancel}
      hasMoreDescription={!!errorMessage}
      description={txFailedResult?.[0] || description}
      retryUpdateType={txFailedResult?.[1] ?? 'origin'}
    />
  );
};
