import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { useTranslation } from 'react-i18next';
import { StrayPageWithButton } from 'ui/component';
import eventBus from '@/eventBus';
import { useApproval, useWallet } from 'ui/utils';
import QRCodeCheckerDetail from '../../../QRCodeCheckerDetail';
import { useHistory } from 'react-router-dom';
import { RequestSignPayload } from '@/background/service/keyring/eth-keystone-keyring';

enum QRHARDWARE_STATUS {
  SYNC,
  SIGN,
}

const QRHardWareWaiting = ({ params }) => {
  const [status, setStatus] = useState<QRHARDWARE_STATUS>(
    QRHARDWARE_STATUS.SYNC
  );
  const [signPayload, setSignPayload] = useState<RequestSignPayload>();
  const [getApproval, resolveApproval, rejectApproval] = useApproval();
  const { t } = useTranslation();
  const [errorMessage, setErrorMessage] = useState('');
  const [isSignText, setIsSignText] = useState(false);
  const history = useHistory();
  const wallet = useWallet();
  const [walletBrandContent, setWalletBrandContent] = useState(
    WALLET_BRAND_CONTENT[WALLET_BRAND_TYPES.KEYSTONE]
  );
  const chain = Object.values(CHAINS).find(
    (item) => item.id === (params.chainId || 1)
  )!.enum;
  const init = useCallback(async () => {
    const approval = await getApproval();
    const account = await wallet.syncGetCurrentAccount()!;
    if (!account) return;
    setWalletBrandContent(WALLET_BRAND_CONTENT[account.brandName]);
    setIsSignText(
      params.isGnosis ? true : approval?.data.approvalType !== 'SignTx'
    );
    eventBus.addEventListener(
      EVENTS.QRHARDWARE.ACQUIRE_MEMSTORE_SUCCEED,
      ({ request }) => {
        setSignPayload(request);
      }
    );
    eventBus.addEventListener(EVENTS.SIGN_FINISHED, async (data) => {
      if (data.success) {
        if (params.isGnosis) {
          const sigs = await wallet.getGnosisTransactionSignatures();
          if (sigs.length > 0) {
            await wallet.gnosisAddConfirmation(account.address, data.data);
          } else {
            await wallet.gnosisAddSignature(account.address, data.data);
            await wallet.postGnosisTransaction();
          }
        }
        resolveApproval(data.data, !isSignText, false, approval.id);
      } else {
        rejectApproval(data.errorMsg);
      }
      history.push('/');
    });
    await wallet.acquireKeystoneMemStoreData();
  }, []);

  useEffect(() => {
    init();
    return () => {
      eventBus.removeAllEventListeners(EVENTS.SIGN_FINISHED);
      eventBus.removeAllEventListeners(
        EVENTS.QRHARDWARE.ACQUIRE_MEMSTORE_SUCCEED
      );
    };
  }, [init]);

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
            setErrorMessage('Failed to get explain');
            return;
          }

          const explain = signingTx.explain;

          stats.report('signTransaction', {
            type: account.brandName,
            chainId: CHAINS[chain].serverId,
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

  return (
    <StrayPageWithButton
      hasBack
      hasDivider
      noPadding
      className="qr-hardware-sign"
      onBackClick={handleCancel}
      NextButtonContent={t('Get Signature')}
      onNextClick={handleRequestSignature}
      nextDisabled={status == QRHARDWARE_STATUS.SIGN}
    >
      <header className="create-new-header create-password-header h-[264px]">
        <img
          className="rabby-logo"
          src="/images/logo-white.svg"
          alt="rabby logo"
        />
        <img
          className="unlock-logo w-[80px] h-[75px] mb-20 mx-auto"
          src={walletBrandContent.image}
        />
        <p className="text-24 mb-4 mt-0 text-white text-center font-bold">
          {t(walletBrandContent.name)}
        </p>
        <p className="text-14 mb-0 mt-4 text-white opacity-80 text-center">
          Scan the QR code on the {walletBrandContent.name} hardware wallet
        </p>
        <img src="/images/watch-mask.png" className="mask" />
      </header>
      <div className="flex justify-center qrcode-scanner">
        {status === QRHARDWARE_STATUS.SYNC && signPayload && (
          <Player
            type={signPayload.payload.type}
            cbor={signPayload.payload.cbor}
          />
        )}
        {status === QRHARDWARE_STATUS.SIGN && (
          <Reader
            requestId={signPayload?.requestId}
            setErrorMessage={setErrorMessage}
            address={params?.account?.address}
          />
        )}
        {showErrorChecker && (
          <QRCodeCheckerDetail
            visible={showErrorChecker}
            onCancel={handleCancel}
            data={errorMessage}
            onOk={handleRequestSignature}
            okText={t('Retry')}
            cancelText={t('Cancel')}
          />
        )}
      </div>
    </StrayPageWithButton>
  );
};

export default QRHardWareWaiting;
