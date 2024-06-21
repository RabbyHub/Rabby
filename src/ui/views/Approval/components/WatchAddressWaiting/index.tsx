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
import Scan from './Scan';
import { message } from 'antd';
import { useSessionStatus } from '@/ui/component/WalletConnect/useSessionStatus';
import { adjustV } from '@/ui/utils/gnosis';
import { findChain, findChainByEnum } from '@/utils/chain';
import { emitSignComponentAmounted } from '@/utils/signEvent';

interface ApprovalParams {
  address: string;
  chainId?: number;
  isGnosis?: boolean;
  data?: string[];
  account?: Account;
  $ctx?: any;
  extra?: Record<string, any>;
  signingTxId?: string;
}

const WatchAddressWaiting = ({ params }: { params: ApprovalParams }) => {
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
  const [getApproval, resolveApproval, rejectApproval] = useApproval();
  const chain =
    findChain({
      id: params.chainId || 1,
    })?.enum || CHAINS_ENUM.ETH;
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
    const account = params.isGnosis
      ? params.account!
      : (await wallet.syncGetCurrentAccount())!;
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
    const signingTx = await wallet.getSigningTx(params.signingTxId!);

    explainRef.current = signingTx?.explain;
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

  const handleRetry = async () => {
    const account = params.isGnosis
      ? params.account!
      : (await wallet.syncGetCurrentAccount())!;
    // await wallet.killWalletConnectConnector(account.address, account.brandName);
    // await initWalletConnect();
    setConnectStatus(WALLETCONNECT_STATUS_MAP.PENDING);
    setConnectError(null);
    wallet.resendWalletConnect(account);
    message.success(t('page.signFooterBar.walletConnect.requestSuccessToast'));
  };

  const handleRefreshQrCode = () => {
    initWalletConnect();
  };

  const init = async () => {
    const approval = await getApproval();
    const account = params.isGnosis
      ? params.account!
      : (await wallet.syncGetCurrentAccount())!;

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
          rejectApproval(e.message);
          return;
        }
        if (!isSignTextRef.current) {
          // const tx = approval.data?.params;
          const explain = explainRef.current;
          if (explain) {
            // const { nonce, from, chainId } = tx;
            // const explain = await wallet.getExplainCache({
            //   nonce: Number(nonce),
            //   address: from,
            //   chainId: Number(chainId),
            // });
            //   wallet.reportStats('signedTransaction', {
            //     type: account.brandName,
            //     chainId: findChainByEnum(chain)?.serverId || '',
            //     category: KEYRING_CATEGORY_MAP[account.type],
            //     success: true,
            //     preExecSuccess: explain
            //       ? explain?.calcSuccess && explain?.pre_exec.success
            //       : true,
            //     createdBy: params?.$ctx?.ga ? 'rabby' : 'dapp',
            //     source: params?.$ctx?.ga?.source || '',
            //     trigger: params?.$ctx?.ga?.trigger || '',
            //   });
          }
        }
        setSignFinishedData({
          data: sig,
          approvalId: approval.id,
        });
      } else {
        if (!isSignTextRef.current) {
          // const tx = approval.data?.params;
          const explain = explainRef.current;
          if (explain) {
            // const { nonce, from, chainId } = tx;
            // const explain = await wallet.getExplainCache({
            //   nonce: Number(nonce),
            //   address: from,
            //   chainId: Number(chainId),
            // });
            // wallet.reportStats('signedTransaction', {
            //   type: account.brandName,
            //   chainId: findChainByEnum(chain)?.serverId || '',
            //   category: KEYRING_CATEGORY_MAP[account.type],
            //   success: false,
            //   preExecSuccess: explain
            //     ? explain?.calcSuccess && explain?.pre_exec.success
            //     : true,
            //   createdBy: params?.$ctx?.ga ? 'rabby' : 'dapp',
            //   source: params?.$ctx?.ga?.source || '',
            //   trigger: params?.$ctx?.ga?.trigger || '',
            // });
          }
        }
        rejectApproval(data.errorMsg);
      }
    });

    eventBus.addEventListener(
      EVENTS.WALLETCONNECT.STATUS_CHANGED,
      async ({ status, payload }) => {
        setVisible(true);
        setConnectStatus(status);
        if (
          status !== WALLETCONNECT_STATUS_MAP.FAILED &&
          status !== WALLETCONNECT_STATUS_MAP.REJECTED
        ) {
          if (!isText && !isSignTriggered) {
            const explain = explainRef.current;
            const chainInfo = findChainByEnum(chain);

            // const tx = approval.data?.params;
            if (explain || chainInfo?.isTestnet) {
              // const { nonce, from, chainId } = tx;
              // const explain = await wallet.getExplainCache({
              //   nonce: Number(nonce),
              //   address: from,
              //   chainId: Number(chainId),
              // });

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
              label: chainInfo?.isTestnet
                ? 'Custom Network'
                : 'Integrated Network',
            });
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
        }
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
    setHeight(360);
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
            />
          )
        )}
      </div>
    </div>
  );
};

export default WatchAddressWaiting;
