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
  useApproval,
  openInTab,
  openInternalPageInTab,
  useWallet,
  useCommonPopupView,
} from 'ui/utils';
import { adjustV } from 'ui/utils/gnosis';
import eventBus from '@/eventBus';
import stats from '@/stats';
import LedgerSVG from 'ui/assets/walletlogo/ledger.svg';
import {
  ApprovalPopupContainer,
  Props as ApprovalPopupContainerProps,
} from './Popup/ApprovalPopupContainer';
import { useLedgerStatus } from '@/ui/component/ConnectStatus/useLedgerStatus';
import * as Sentry from '@sentry/browser';

interface ApprovalParams {
  address: string;
  chainId?: number;
  isGnosis?: boolean;
  data?: string[];
  account?: Account;
  $ctx?: any;
  extra?: Record<string, any>;
}

const LedgerHardwareWaiting = ({ params }: { params: ApprovalParams }) => {
  const { setTitle, setVisible, visible, closePopup } = useCommonPopupView();
  const [statusProp, setStatusProp] = React.useState<
    ApprovalPopupContainerProps['status']
  >('SENDING');
  const [content, setContent] = React.useState('');
  const [description, setDescription] = React.useState('');
  const wallet = useWallet();

  const [connectStatus, setConnectStatus] = React.useState(
    WALLETCONNECT_STATUS_MAP.WAITING
  );
  const [getApproval, resolveApproval, rejectApproval] = useApproval();
  const chain = Object.values(CHAINS).find(
    (item) => item.id === (params.chainId || 1)
  )!;
  const { t } = useTranslation();
  const [isSignText, setIsSignText] = React.useState(false);
  const [result, setResult] = React.useState('');
  const [errorMessage, setErrorMessage] = React.useState('');
  const [isClickDone, setIsClickDone] = React.useState(false);
  const [signFinishedData, setSignFinishedData] = React.useState<{
    data: any;
    approvalId: string;
  }>();
  const { status: sessionStatus } = useLedgerStatus();
  const firstConnectRef = React.useRef<boolean>(false);
  const mountedRef = React.useRef(false);
  const showDueToStatusChangeRef = React.useRef(false);

  const handleCancel = () => {
    rejectApproval('user cancel');
  };

  const handleRetry = async (showToast = true) => {
    if (connectStatus === WALLETCONNECT_STATUS_MAP.SUBMITTING) {
      message.success(t('page.signFooterBar.ledger.resubmited'));
      return;
    }
    if (sessionStatus === 'DISCONNECTED') return;
    const account = await wallet.syncGetCurrentAccount()!;
    setConnectStatus(WALLETCONNECT_STATUS_MAP.WAITING);
    await wallet.resendSign();
    if (showToast) {
      message.success(t('page.signFooterBar.ledger.resent'));
    }
  };

  const handleClickResult = () => {
    const url = chain.scanLink.replace(/_s_/, result);
    openInTab(url);
  };

  const init = async () => {
    const account = params.isGnosis
      ? params.account!
      : (await wallet.syncGetCurrentAccount())!;
    const approval = await getApproval();

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

        if (!signingTx?.explain) {
          setErrorMessage(t('page.signFooterBar.qrcode.failedToGetExplain'));
          return;
        }

        const explain = signingTx.explain;

        stats.report('signTransaction', {
          type: account.brandName,
          chainId: chain.serverId,
          category: KEYRING_CATEGORY_MAP[account.type],
          preExecSuccess: explain
            ? explain?.calcSuccess && explain?.pre_exec.success
            : true,
          createBy: params?.$ctx?.ga ? 'rabby' : 'dapp',
          source: params?.$ctx?.ga?.source || '',
          trigger: params?.$ctx?.ga?.trigger || '',
        });
      }
    } else {
      stats.report('startSignText', {
        type: account.brandName,
        category: KEYRING_CATEGORY_MAP[account.type],
        method: params?.extra?.signTextMethod,
      });
    }
    eventBus.addEventListener(EVENTS.LEDGER.REJECT_APPROVAL, (data) => {
      rejectApproval(data, false, true);
    });
    eventBus.addEventListener(EVENTS.LEDGER.REJECTED, async (data) => {
      setErrorMessage(data);
      if (/DisconnectedDeviceDuringOperation/i.test(data)) {
        await rejectApproval('User rejected the request.');
        openInternalPageInTab('request-permission?type=ledger&from=approval');
      }
      setConnectStatus(WALLETCONNECT_STATUS_MAP.REJECTED);
    });
    eventBus.addEventListener(EVENTS.TX_SUBMITTING, async () => {
      setConnectStatus(WALLETCONNECT_STATUS_MAP.SUBMITTING);
    });
    eventBus.addEventListener(EVENTS.SIGN_FINISHED, async (data) => {
      if (data.success) {
        let sig = data.data;
        setResult(sig);
        setConnectStatus(WALLETCONNECT_STATUS_MAP.SUBMITTED);
        try {
          if (params.isGnosis) {
            sig = adjustV('eth_signTypedData', sig);
            const sigs = await wallet.getGnosisTransactionSignatures();
            if (sigs.length > 0) {
              await wallet.gnosisAddConfirmation(account.address, sig);
            } else {
              await wallet.gnosisAddSignature(account.address, sig);
              await wallet.postGnosisTransaction();
            }
          }
        } catch (e) {
          Sentry.captureException(e);
          setConnectStatus(WALLETCONNECT_STATUS_MAP.FAILED);
          return;
        }
        matomoRequestEvent({
          category: 'Transaction',
          action: 'Submit',
          label: KEYRING_CLASS.HARDWARE.LEDGER,
        });
        // TODO: Why check permissions after signature completion?
        // const hasPermission = await wallet.checkLedgerHasHIDPermission();
        // const isUseLedgerLive = await wallet.isUseLedgerLive();
        // if (!hasPermission && !isUseLedgerLive) {
        //   await wallet.authorizeLedgerHIDPermission();
        // }
        setSignFinishedData({
          data: sig,
          approvalId: approval.id,
        });
      } else {
        Sentry.captureException(
          new Error('Ledger sign error: ' + JSON.stringify(data))
        );
        setConnectStatus(WALLETCONNECT_STATUS_MAP.FAILED);
        setErrorMessage(data.errorMsg);
      }
    });
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
    setTitle(
      <div className="flex justify-center items-center">
        <img src={LedgerSVG} className="w-20 mr-8" />
        <span>
          {t('page.signFooterBar.qrcode.signWith', { brand: 'Ledger' })}
        </span>
      </div>
    );
    init();
    mountedRef.current = true;
  }, []);

  // React.useEffect(() => {
  //   if (visible && mountedRef.current && !showDueToStatusChangeRef.current) {
  //     console.log('handle retry');
  //     handleRetry(false);
  //   }
  //   showDueToStatusChangeRef.current = false;
  // }, [visible]);

  React.useEffect(() => {
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
        setContent(t('page.signFooterBar.ledger.txRejected'));
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
    if (description.includes('0x5515') || description.includes('0x6b0c')) {
      return t('page.signFooterBar.ledger.unlockAlert');
    } else if (
      description.includes('0x6e00') ||
      description.includes('0x6b00')
    ) {
      return t('page.signFooterBar.ledger.updateFirmwareAlert');
    } else if (description.includes('0x6985')) {
      return t('page.signFooterBar.ledger.txRejectedByLedger');
    }

    return description;
  }, [description]);

  return (
    <ApprovalPopupContainer
      showAnimation
      hdType="wired"
      status={statusProp}
      onRetry={() => handleRetry()}
      onDone={() => setIsClickDone(true)}
      onCancel={handleCancel}
      description={
        <>
          {currentDescription}
          {currentDescription.includes('EthAppPleaseEnableContractData') && (
            <a
              className="underline text-blue-light block text-center mt-8"
              href="https://support.ledger.com/hc/en-us/articles/4405481324433-Enable-blind-signing-in-the-Ethereum-ETH-app?docs=true"
              onClick={(e) => {
                e.preventDefault();
                window.open(
                  e.currentTarget.href,
                  '_blank',
                  'noopener,noreferrer'
                );
              }}
            >
              {t('page.signFooterBar.ledger.blindSigTutorial')}
            </a>
          )}
        </>
      }
      content={content}
      hasMoreDescription={statusProp === 'REJECTED' || statusProp === 'FAILED'}
    />
  );
};

export default LedgerHardwareWaiting;
