import React, { useCallback, useMemo, useState } from 'react';
import stats from '@/stats';
import Player from './Player';
import Reader from './Reader';
import {
  CHAINS,
  CHAINS_ENUM,
  EVENTS,
  HARDWARE_KEYRING_TYPES,
  KEYRING_CATEGORY_MAP,
  WALLET_BRAND_CONTENT,
  WALLET_BRAND_TYPES,
} from 'consts';
import eventBus from '@/eventBus';
import { useCommonPopupView, useWallet } from 'ui/utils';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ApprovalPopupContainer } from '../Popup/ApprovalPopupContainer';
import { adjustV } from '@/ui/utils/gnosis';
import { findChain, findChainByEnum } from '@/utils/chain';
import {
  UnderlineButton as SwitchButton,
  SIGNATURE_METHOD,
  useCanSwitchSignature,
  KeystoneWiredWaiting,
} from './KeystoneWaiting';
import clsx from 'clsx';
import { notifySigningUiReady } from '@/utils/signEvent';
import type { SigningAttempt } from '@/utils/signEvent';
import { useApprovalScope } from '@/ui/approval/context';
import { useApprovalActions } from '@/ui/approval/actions';
import { useSigningAttemptEvents } from '@/ui/hooks/useSigningAttemptEvents';
import { requireSigningAttempt } from '@/utils/signingTypes';

const KEYSTONE_TYPE = HARDWARE_KEYRING_TYPES.Keystone.type;
enum QRHARDWARE_STATUS {
  SYNC,
  SIGN,
  RECEIVED,
  DONE,
}

export type RequestSignPayload = {
  requestId: string;
  payload: {
    type: string;
    cbor: string;
  };
};

const QRHardWareWaiting = ({ params, account: $account }) => {
  const account = params.isGnosis ? params.account : $account;
  const { setTitle, closePopup, setHeight } = useCommonPopupView();
  const [status, setStatus] = useState<QRHARDWARE_STATUS>(
    QRHARDWARE_STATUS.SYNC
  );
  const [brand, setBrand] = useState<string>('');
  const canSwitchSignature = useCanSwitchSignature(brand);
  const [signMethod, setSignMethod] = useState<SIGNATURE_METHOD>(
    SIGNATURE_METHOD.QRCODE
  );
  const defalutSignMethodSetted = React.useRef(false);
  const [signPayload, setSignPayload] = useState<RequestSignPayload>();
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
  const approvalRef = React.useRef<any>();
  const handlersRef = React.useRef<{
    onFinished?: (data: any) => void;
  }>({});
  useSigningAttemptEvents(attemptRef, {
    onFinished: (data) => handlersRef.current.onFinished?.(data),
  });
  const acquireMemStoreListener = React.useRef<((data: any) => void) | null>(
    null
  );
  const [errorMessage, setErrorMessage] = useState('');
  const [isSignText, setIsSignText] = useState(false);
  const { t } = useTranslation();
  const history = useHistory();
  const wallet = useWallet();
  const [walletBrandContent, setWalletBrandContent] = useState(
    WALLET_BRAND_CONTENT[WALLET_BRAND_TYPES.KEYSTONE]
  );
  const [content, setContent] = React.useState('');
  const [isClickDone, setIsClickDone] = React.useState(false);
  const [signFinishedData, setSignFinishedData] = React.useState<{
    data: any;
    stay: boolean;
    signingAttempt?: SigningAttempt;
  }>();

  React.useEffect(() => {
    if (!defalutSignMethodSetted.current && canSwitchSignature) {
      setSignMethod(
        canSwitchSignature ? SIGNATURE_METHOD.USB : SIGNATURE_METHOD.QRCODE
      );
      defalutSignMethodSetted.current = true;
    }
  }, [canSwitchSignature]);

  const chain =
    findChain({
      id: params.chainId || 1,
    })?.enum || CHAINS_ENUM.ETH;
  const init = useCallback(async () => {
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
    approvalRef.current = approval;
    if (!account || !approval) return;
    if (approval.signing?.attempt) {
      attemptRef.current = approval.signing.attempt;
    }
    setBrand(account.brandName);
    const icon = WALLET_BRAND_CONTENT[account.brandName].icon;
    setTitle(
      <div className="flex justify-center items-center">
        <img src={icon} className="w-20 mr-8" />
        <span>
          {t('page.signFooterBar.qrcode.signWith', {
            brand: account.brandName,
          })}
        </span>
      </div>
    );
    setHeight('fit-content');
    setWalletBrandContent(WALLET_BRAND_CONTENT[account.brandName]);
    setIsSignText(
      params.isGnosis ? true : approval?.data.approvalType !== 'SignTx'
    );

    const onAcquireMemStore = async ({ request }) => {
      if (!(await wallet.isApprovalCurrent(approval.id))) return;
      let currentSignId = null;
      if (account.brandName === WALLET_BRAND_TYPES.KEYSTONE) {
        currentSignId = await wallet.requestKeyring(
          KEYSTONE_TYPE,
          'exportCurrentSignRequestIdIfExist',
          null
        );
        if (!(await wallet.isApprovalCurrent(approval.id))) return;
      }

      if (currentSignId) {
        if (currentSignId === request.requestId) {
          setSignPayload(request);
        }
        return;
      }
      setSignPayload(request);
    };
    acquireMemStoreListener.current = onAcquireMemStore;
    eventBus.addEventListener(
      EVENTS.QRHARDWARE.ACQUIRE_MEMSTORE_SUCCEED,
      onAcquireMemStore
    );
    const onSignFinished = async (data) => {
      if (!(await wallet.isApprovalCurrent(approval.id))) return;
      const signingAttempt = data.attempt;
      if (data.success) {
        let sig = data.data;
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
          setErrorMessage(e.message);
          // rejectApproval(e.message);
          return;
        }
        if (!(await wallet.isApprovalCurrent(approval.id))) return;
        setStatus(QRHARDWARE_STATUS.DONE);
        setSignFinishedData({
          data: sig,
          stay: !isSignText,
          signingAttempt: data.attempt,
        });
      } else {
        setErrorMessage(data.errorMsg);
        // rejectApproval(data.errorMsg);
      }
    };
    handlersRef.current = { onFinished: onSignFinished };

    const attempt = approvalScope.signing?.attempt;
    if (attempt) {
      attemptRef.current = attempt;
      notifySigningUiReady(attempt);
    }
    if (await wallet.isApprovalCurrent(approval.id)) {
      wallet.acquireKeystoneMemStoreData();
    }
  }, []);

  React.useEffect(() => {
    init();
    return () => {
      handlersRef.current = {};
      if (acquireMemStoreListener.current) {
        eventBus.removeEventListener(
          EVENTS.QRHARDWARE.ACQUIRE_MEMSTORE_SUCCEED,
          acquireMemStoreListener.current
        );
      }
    };
  }, [init]);

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

  const handleCancel = () => {
    rejectApproval('User rejected the request.');
  };
  const handleRetry = async () => {
    if (!(await wallet.isApprovalCurrent(approvalScope.approval.approvalId)))
      return;
    const context = getSigningContext();
    if (!context) return;
    const attempt = await wallet.resendSign({ retry: false, context });
    if (!attempt) return;
    attemptRef.current = attempt;
    notifySigningUiReady(attempt);
    await handleRequestSignature();
    setStatus(QRHARDWARE_STATUS.SYNC);
  };
  const handleRequestSignature = async () => {
    const approval = approvalRef.current;
    if (!approval) return;
    if (account) {
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
          if (!(await wallet.isApprovalCurrent(approval.id))) return;
          const chainInfo = findChain({
            enum: chain,
          });

          if (!signingTx?.explain && chainInfo && !chainInfo.isTestnet) {
            setErrorMessage(t('page.signFooterBar.qrcode.failedToGetExplain'));
            return;
          }

          const explain = signingTx?.explain;

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
            signMethod,
            networkType: chainInfo?.isTestnet
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
      setErrorMessage('');
      setStatus(QRHARDWARE_STATUS.SIGN);
    }
  };

  const [scanMessage, setScanMessage] = React.useState();
  const handleScan = (scanMessage) => {
    setScanMessage(scanMessage);
    setStatus(QRHARDWARE_STATUS.RECEIVED);
  };

  const handleSubmit = async () => {
    // cache signMethod in statsData
    if (!(await wallet.isApprovalCurrent(approvalScope.approval.approvalId)))
      return;
    await wallet.setStatsData({
      signMethod,
    });
    if (!(await wallet.isApprovalCurrent(approvalScope.approval.approvalId)))
      return;
    const context = getSigningContext();
    if (!context) return;
    void wallet
      .submitQRHardwareSignature(
        signPayload!.requestId,
        scanMessage!,
        context,
        account?.address
      )
      .catch((error) => {
        if (error?.code !== 4001)
          setErrorMessage(error?.message || String(error));
      });
  };

  const popupStatus = React.useMemo(() => {
    if (errorMessage) {
      setContent(t('page.signFooterBar.qrcode.txFailed'));
      return 'FAILED';
    }

    if (status === QRHARDWARE_STATUS.RECEIVED) {
      setContent(t('page.signFooterBar.qrcode.sigReceived'));
      return 'SUBMITTING';
    }
    if (status === QRHARDWARE_STATUS.DONE) {
      setContent(t('page.signFooterBar.qrcode.sigCompleted'));
      return 'RESOLVED';
    }
    if ([QRHARDWARE_STATUS.SIGN, QRHARDWARE_STATUS.SYNC].includes(status)) {
      setContent('');
      return;
    }
  }, [status, errorMessage]);

  const [hiddenSwitchButton, setHiddenSwitchButton] = useState(false);
  const shouldShowSignatureSwitchButton = useMemo(() => {
    return (
      canSwitchSignature &&
      !hiddenSwitchButton &&
      signMethod === SIGNATURE_METHOD.QRCODE &&
      ![QRHARDWARE_STATUS.SIGN, QRHARDWARE_STATUS.DONE].includes(status)
    );
  }, [status, canSwitchSignature, hiddenSwitchButton, signMethod]);

  const calcSignComponent = useCallback(() => {
    if (signMethod === SIGNATURE_METHOD.USB) {
      const onKeystoneWaitingPageDone = () => setIsClickDone(true);
      const onKeystoneWaitingPageSetErrorMessage = (error) =>
        setErrorMessage(error);
      const onKeystoneWaitingPageHandleSuccess = (message) => {
        setScanMessage(message);
        const context = getSigningContext();
        if (!context) return;
        void wallet
          .submitQRHardwareSignature(
            signPayload!.requestId,
            message,
            context,
            account?.address
          )
          .catch((error) => {
            if (error?.code !== 4001)
              setErrorMessage(error?.message || String(error));
          });
      };
      return (
        <KeystoneWiredWaiting
          isDone={status === QRHARDWARE_STATUS.DONE}
          onRetry={handleRetry}
          onDone={onKeystoneWaitingPageDone}
          payload={signPayload?.payload}
          errorMessage={errorMessage}
          setHiddenSwitchButton={setHiddenSwitchButton}
          setErrorMessage={onKeystoneWaitingPageSetErrorMessage}
          requestId={signPayload?.requestId}
          handleCancel={handleCancel}
          handleSuccess={onKeystoneWaitingPageHandleSuccess}
        />
      );
    }

    return (
      <>
        {status === QRHARDWARE_STATUS.SYNC && signPayload && (
          <Player
            layoutStyle={shouldShowSignatureSwitchButton ? 'normal' : 'compact'}
            playerSize={shouldShowSignatureSwitchButton ? 144 : 260}
            type={signPayload.payload.type}
            cbor={signPayload.payload.cbor}
            onSign={handleRequestSignature}
            brandName={walletBrandContent.brand}
          />
        )}
        {status === QRHARDWARE_STATUS.SIGN && (
          <Reader
            requestId={signPayload?.requestId}
            setErrorMessage={setErrorMessage}
            brandName={walletBrandContent.brand}
            onScan={handleScan}
          />
        )}
      </>
    );
  }, [
    wallet,
    params,
    status,
    scanMessage,
    signPayload,
    walletBrandContent,
    signMethod,
    errorMessage,
    shouldShowSignatureSwitchButton,
  ]);

  if (popupStatus && signMethod === SIGNATURE_METHOD.QRCODE) {
    return (
      <ApprovalPopupContainer
        showAnimation
        hdType="qrcode"
        status={popupStatus}
        content={content}
        description={errorMessage}
        onCancel={handleCancel}
        onRetry={handleRetry}
        onDone={() => setIsClickDone(true)}
        onSubmit={handleSubmit}
        hasMoreDescription={!!errorMessage}
      />
    );
  }

  return (
    <section className="h-full">
      <div
        className={clsx(
          shouldShowSignatureSwitchButton ? '' : 'justify-center',
          'flex qrcode-scanner flex-col h-full'
        )}
      >
        {calcSignComponent()}
        {shouldShowSignatureSwitchButton && (
          <SwitchButton
            className="mt-20"
            onClick={() => {
              if (signMethod === SIGNATURE_METHOD.USB) {
                setSignMethod(SIGNATURE_METHOD.QRCODE);
              } else {
                setSignMethod(SIGNATURE_METHOD.USB);
              }
            }}
          >
            {t('page.signFooterBar.keystone.signWith', {
              method:
                signMethod === SIGNATURE_METHOD.QRCODE ? 'USB' : 'QR Code',
            })}
          </SwitchButton>
        )}
      </div>
    </section>
  );
};

export default QRHardWareWaiting;
