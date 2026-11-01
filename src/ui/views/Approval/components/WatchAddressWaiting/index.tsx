import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Account } from 'background/service/preference';
import { CHAINS, WALLETCONNECT_STATUS_MAP, EVENTS, CHAINS_ENUM } from 'consts';
import {
  bindApproval,
  useApproval,
  useCommonPopupView,
  useWallet,
} from 'ui/utils';
import eventBus from '@/eventBus';
import Process from './Process';
import Scan from './Scan';
import { message } from 'antd';
import { useSessionStatus } from '@/ui/component/WalletConnect/useSessionStatus';
import { adjustV } from '@/ui/utils/gnosis';
import { findChain } from '@/utils/chain';
import { emitSignComponentAmounted } from '@/utils/signEvent';

interface ApprovalParams {
  address: string;
  chainId?: number;
  nonce?: string;
  from?: string;
  isGnosis?: boolean;
  data?: string[];
  account?: Account;
  $ctx?: any;
  extra?: Record<string, any>;
  signingTxId?: string;
  safeMessage?: {
    safeMessageHash: string;
    safeAddress: string;
    message: string;
    chainId: number;
  };
  stay?: boolean;
}

const WatchAddressWaiting = ({
  params,
  account: $account,
  approvalId,
}: {
  params: ApprovalParams;
  account: Account;
  approvalId?: string;
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
  const [qrcodeContent, setQrcodeContent] = useState('');
  const [result, setResult] = useState('');
  const [getApproval, resolveApproval, rejectApproval] = useApproval(
    bindApproval(approvalId, 'WatchAddressWaiting')
  );
  const chain =
    findChain({
      id: params.chainId || 1,
    })?.enum || CHAINS_ENUM.ETH;
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
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
    eventBus.addEventListener(EVENTS.WALLETCONNECT.INITED, ({ uri }) => {
      setQrcodeContent(uri);
    });
    if (
      status !== WALLETCONNECT_STATUS_MAP.CONNECTED &&
      status !== WALLETCONNECT_STATUS_MAP.SUBMITTED
    ) {
      eventBus.emit(EVENTS.broadcastToBackground, {
        method: EVENTS.WALLETCONNECT.INIT,
        data: account,
      });
    }
  };

  const handleCancel = () => {
    rejectApproval('user cancel');
  };

  const handleRetry = async (retry?: boolean) => {
    const account = params.isGnosis ? params.account! : $account;
    setConnectStatus(WALLETCONNECT_STATUS_MAP.WAITING);
    setConnectError(null);
    wallet.resendSign(retry);
    message.success(t('page.signFooterBar.walletConnect.requestSuccessToast'));
    emitSignComponentAmounted();
  };

  const handleRefreshQrCode = () => {
    initWalletConnect();
  };

  const init = async () => {
    const approval = await getApproval();
    const account = params.isGnosis ? params.account! : $account;

    setCurrentAccount(account);

    eventBus.addEventListener(EVENTS.SIGN_FINISHED, async (data) => {
      if (data.success) {
        let sig = data.data;
        setResult(sig);
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
        rejectApproval(data.errorMsg);
      }
    });

    eventBus.addEventListener(
      EVENTS.WALLETCONNECT.STATUS_CHANGED,
      async ({ status, payload }) => {
        setVisible(true);
        setConnectStatus(status);
        switch (status) {
          case WALLETCONNECT_STATUS_MAP.CONNECTED:
            break;
          case WALLETCONNECT_STATUS_MAP.FAILED:
          case WALLETCONNECT_STATUS_MAP.REJECTED:
            if (payload?.code) {
              try {
                const error = JSON.parse(payload.message);
                setConnectError({
                  code: payload.code,
                  message: error.message,
                });
              } catch (e) {
                setConnectError(payload);
              }
            } else {
              setConnectError(
                (payload?.params && payload.params[0]) || payload
              );
            }
            break;
          case WALLETCONNECT_STATUS_MAP.SUBMITTED:
            setResult(payload);
            break;
        }
      }
    );
    await initWalletConnect();
    emitSignComponentAmounted();
  };

  useEffect(() => {
    init();
    setHeight('fit-content');
  }, []);

  const { stay = false } = params || {};
  useEffect(() => {
    if (signFinishedData && isClickDone) {
      // Settle before closing: closePopup() unmounts this component, which
      // would flip resolveApproval's mounted-check and reject a settlement still in progress.
      resolveApproval(signFinishedData.data, stay, false).then(() => {
        closePopup();
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
        {connectStatus === WALLETCONNECT_STATUS_MAP.PENDING &&
        qrcodeContent &&
        currentAccount ? (
          <Scan
            uri={qrcodeContent}
            onRefresh={handleRefreshQrCode}
            account={currentAccount}
          />
        ) : (
          currentAccount && (
            <Process
              chain={chain}
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
          )
        )}
      </div>
    </div>
  );
};

export default WatchAddressWaiting;
