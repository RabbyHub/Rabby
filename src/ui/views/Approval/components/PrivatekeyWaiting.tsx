import React from 'react';
import { useTranslation } from 'react-i18next';
import { isSameAddress, useCommonPopupView, useWallet } from 'ui/utils';
import {
  CHAINS,
  EVENTS,
  KEYRING_CATEGORY_MAP,
  KEYRING_CLASS,
  KEYRING_ICONS,
  WALLETCONNECT_STATUS_MAP,
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
import { useThemeMode } from '@/ui/hooks/usePreference';
import { pickKeyringThemeIcon } from '@/utils/account';
import { id } from 'ethers/lib/utils';
import { findChain } from '@/utils/chain';
import { notifySigningUiReady } from '@/utils/signEvent';
import type { SigningAttempt } from '@/utils/signEvent';
import { ga4 } from '@/utils/ga4';
import { useAsync } from 'react-use';
import type { RetryUpdateType } from '@/background/utils/errorTxRetry';
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
  $account: Account;
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

export const PrivatekeyWaiting = ({
  params,
  account: $account,
}: {
  params: ApprovalParams;
  account: Account;
}) => {
  const wallet = useWallet();
  const {
    setTitle,
    setVisible,
    closePopup,
    setHeight,
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
    onSubmitting?: () => void;
  }>({});
  useSigningAttemptEvents(attemptRef, {
    onFinished: (data) => handlersRef.current.onFinished?.(data),
    onSubmitting: () => handlersRef.current.onSubmitting?.(),
  });
  const mountedRef = React.useRef(false);
  const listenersCleanupRef = React.useRef<(() => void) | null>(null);
  const { t } = useTranslation();
  const { type } = params;
  const [errorMessage, setErrorMessage] = React.useState('');
  const chain = findChain({
    id: params.chainId || 1,
  });
  const [connectStatus, setConnectStatus] = React.useState(
    WALLETCONNECT_STATUS_MAP.SUBMITTING
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
    setConnectStatus(WALLETCONNECT_STATUS_MAP.SUBMITTING);

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
  const isSignText = /personalSign|SignTypedData/.test(
    params?.extra?.signTextMethod
  );

  const handleCancel = () => {
    rejectApproval('user cancel');
  };

  const { isDarkTheme } = useThemeMode();

  const brandContent = React.useMemo(() => {
    switch (type) {
      case KEYRING_CLASS.PRIVATE_KEY:
        return {
          name: 'Private Key',
          icon:
            pickKeyringThemeIcon(KEYRING_CLASS.PRIVATE_KEY, isDarkTheme) ||
            KEYRING_ICONS[KEYRING_CLASS.PRIVATE_KEY],
        };
      case KEYRING_CLASS.MNEMONIC:
        return {
          name: 'Seed Phrase',
          icon:
            pickKeyringThemeIcon(KEYRING_CLASS.MNEMONIC, isDarkTheme) ||
            KEYRING_ICONS[KEYRING_CLASS.MNEMONIC],
        };
      default:
        break;
    }
  }, [type, isDarkTheme]);

  const account = params.isGnosis ? params.account! : $account;

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
          console.error(e);
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
        setConnectStatus(WALLETCONNECT_STATUS_MAP.FAILED);
        setErrorMessage(data.errorMsg);
      }
    };
    handlersRef.current = {
      onFinished: onSignFinished,
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
    mountedRef.current = true;
    (async () => {
      setTitle(
        <div className="flex justify-center items-center">
          <img src={brandContent?.icon} className="w-20 mr-8" />
          <span>
            {t('page.signFooterBar.qrcode.signWith', {
              brand: brandContent?.name,
            })}
          </span>
        </div>
      );
      // don't show popup when sign text
      if (isSignText) {
        setHeight(0);
      } else {
        setHeight('fit-content');
      }
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
      case WALLETCONNECT_STATUS_MAP.SUBMITTING:
        setStatusProp('SENDING');
        setContent(t('page.signFooterBar.ledger.submitting'));
        setDescription('');
        break;
      case WALLETCONNECT_STATUS_MAP.FAILED:
        setStatusProp('FAILED');
        setContent(t('page.signFooterBar.qrcode.txFailed'));
        setDescription(errorMessage);
        break;
      case WALLETCONNECT_STATUS_MAP.SUBMITTED:
        // immediate close popup when sign text
        if (isSignText) {
          setIsClickDone(true);
        }
        setStatusProp('RESOLVED');
        setContent(t('page.signFooterBar.qrcode.sigCompleted'));
        setDescription('');
        break;
      default:
        setDescription('');
        break;
    }
  }, [connectStatus, errorMessage]);

  const { value: txFailedResult } = useGetTxFailedResultInWaiting({
    nonce: params?.nonce,
    chainId: params?.chainId,
    status: connectStatus,
    from: params.from,
    description,
  });

  React.useEffect(() => {
    if (
      [
        WALLETCONNECT_STATUS_MAP.FAILED,
        WALLETCONNECT_STATUS_MAP.REJECTED,
      ].includes(connectStatus)
    ) {
      setHeight('fit-content');
      setContent(
        txFailedResult?.[1]
          ? t('page.signFooterBar.qrcode.txFailedRetry')
          : t('page.signFooterBar.qrcode.txFailed')
      );
    }
  }, [txFailedResult?.[1], connectStatus]);

  if (isSignText && connectStatus !== WALLETCONNECT_STATUS_MAP.FAILED) {
    return null;
  }

  return (
    <ApprovalPopupContainer
      showAnimation
      hdType={'privatekey'}
      status={statusProp}
      onRetry={handleRetry}
      content={content}
      onDone={() => setIsClickDone(true)}
      onCancel={handleCancel}
      hasMoreDescription={!!description}
      description={txFailedResult?.[0] || description}
      retryUpdateType={txFailedResult?.[1] ?? 'origin'}
    />
  );
};
