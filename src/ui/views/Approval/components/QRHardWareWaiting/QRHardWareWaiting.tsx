import React, { useCallback, useMemo, useState } from 'react';
import stats from '@/stats';
import Player from './Player';
import Reader from './Reader';
import {
  CHAINS,
  EVENTS,
  KEYRING_CATEGORY_MAP,
  WALLET_BRAND_CONTENT,
  WALLET_BRAND_TYPES,
} from 'consts';
import eventBus from '@/eventBus';
import { useApproval, useCommonPopupView, useWallet } from 'ui/utils';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { RequestSignPayload } from '@/background/service/keyring/eth-keystone-keyring';
import { ApprovalPopupContainer } from '../Popup/ApprovalPopupContainer';
import { adjustV } from '@/ui/utils/gnosis';
import { findChainByEnum } from '@/utils/chain';
import { debounce } from 'lodash';
import {
  UnderlineButton as SwitchButton,
  SIGNATURE_METHOD,
  useCanSwitchSignature,
  KeystoneWiredWaiting,
} from './KeystoneWaiting';
import clsx from 'clsx';

enum QRHARDWARE_STATUS {
  SYNC,
  SIGN,
  RECEIVED,
  DONE,
}

const QRHardWareWaiting = ({ params }) => {
  const { setTitle, closePopup } = useCommonPopupView();
  const [status, setStatus] = useState<QRHARDWARE_STATUS>(
    QRHARDWARE_STATUS.SYNC
  );
  const [brand, setBrand] = useState<string>('');
  const [signMethod, setSignMethod] = useState<SIGNATURE_METHOD>(
    SIGNATURE_METHOD.QRCODE
  );
  const canSwitchSignature = useCanSwitchSignature(brand);
  const [signPayload, setSignPayload] = useState<RequestSignPayload>();
  const [getApproval, resolveApproval, rejectApproval] = useApproval();
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
    approvalId: string;
  }>();

  const chain = Object.values(CHAINS).find(
    (item) => item.id === (params.chainId || 1)
  )!.enum;
  const init = useCallback(async () => {
    const approval = await getApproval();
    const account = await wallet.syncGetCurrentAccount()!;
    if (!account) return;
    setBrand(account.brandName);
    setTitle(
      <div className="flex justify-center items-center">
        <img src={walletBrandContent.icon} className="w-20 mr-8" />
        <span>
          {t('page.signFooterBar.qrcode.signWith', {
            brand: account.brandName,
          })}
        </span>
      </div>
    );
    setWalletBrandContent(WALLET_BRAND_CONTENT[account.brandName]);
    setIsSignText(
      params.isGnosis ? true : approval?.data.approvalType !== 'SignTx'
    );

    const debounceSetSignPayload = debounce(({ request }) => {
      setSignPayload(request);
    }, 100);

    eventBus.addEventListener(
      EVENTS.QRHARDWARE.ACQUIRE_MEMSTORE_SUCCEED,
      debounceSetSignPayload
    );
    eventBus.addEventListener(EVENTS.SIGN_FINISHED, async (data) => {
      if (data.success) {
        let sig = data.data;
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
          setErrorMessage(e.message);
          // rejectApproval(e.message);
          return;
        }
        setStatus(QRHARDWARE_STATUS.DONE);
        setSignFinishedData({
          data: sig,
          stay: !isSignText,
          approvalId: approval.id,
        });
      } else {
        setErrorMessage(data.errorMsg);
        // rejectApproval(data.errorMsg);
      }
    });
    await wallet.acquireKeystoneMemStoreData();
  }, []);

  React.useEffect(() => {
    init();
    return () => {
      eventBus.removeAllEventListeners(EVENTS.SIGN_FINISHED);
      eventBus.removeAllEventListeners(
        EVENTS.QRHARDWARE.ACQUIRE_MEMSTORE_SUCCEED
      );
    };
  }, [init]);

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

  const handleCancel = () => {
    rejectApproval('User rejected the request.');
  };
  const handleRequestSignature = async () => {
    const account = await wallet.syncGetCurrentAccount()!;
    const approval = await getApproval();
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

          if (!signingTx?.explain) {
            setErrorMessage(t('page.signFooterBar.qrcode.failedToGetExplain'));
            return;
          }

          const explain = signingTx.explain;

          stats.report('signTransaction', {
            type: account.brandName,
            chainId: findChainByEnum(chain)?.serverId || '',
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
      setErrorMessage('');
      setStatus(QRHARDWARE_STATUS.SIGN);
    }
  };

  const showErrorChecker = useMemo(() => {
    return errorMessage !== '' && status == QRHARDWARE_STATUS.SIGN;
  }, [errorMessage]);

  const [scanMessage, setScanMessage] = React.useState();
  const handleScan = (scanMessage) => {
    setScanMessage(scanMessage);
    setStatus(QRHARDWARE_STATUS.RECEIVED);
  };

  const handleDone = () => {
    history.push('/');
  };

  const handleSubmit = () => {
    wallet.submitQRHardwareSignature(
      signPayload!.requestId,
      scanMessage!,
      params?.account?.address
    );
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
      status !== QRHARDWARE_STATUS.DONE &&
      canSwitchSignature &&
      !hiddenSwitchButton
    );
  }, [status, canSwitchSignature, hiddenSwitchButton]);

  const calcSignComponent = useCallback(() => {
    if (signMethod === SIGNATURE_METHOD.USB) {
      const onKeystoneWaitingPageDone = () => setIsClickDone(true);
      const onKeystoneWaitingPageSetErrorMessage = (error) =>
        setErrorMessage(error);
      const onKeystoneWaitingPageHandleSuccess = (message) => {
        setScanMessage(message);
        wallet.submitQRHardwareSignature(
          signPayload!.requestId,
          message,
          params?.account?.address
        );
      };
      const onKeystoneWaitingPageRetry = async () => {
        await handleRequestSignature();
        setStatus(QRHARDWARE_STATUS.SYNC);
      };

      return (
        <KeystoneWiredWaiting
          isDone={status === QRHARDWARE_STATUS.DONE}
          onRetry={onKeystoneWaitingPageRetry}
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
            playerSize={shouldShowSignatureSwitchButton ? 160 : 180}
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
        onRetry={handleRequestSignature}
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
