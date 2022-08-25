import React, { useEffect, useState } from 'react';
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';
import ReactGA from 'react-ga';
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
  useWalletOld,
} from 'ui/utils';
import eventBus from '@/eventBus';
import stats from '@/stats';
import { SvgIconOpenExternal } from 'ui/assets';

interface ApprovalParams {
  address: string;
  chainId?: number;
  isGnosis?: boolean;
  data?: string[];
  account?: Account;
  $ctx?: any;
}

const LedgerHardwareWaiting = ({ params }: { params: ApprovalParams }) => {
  const wallet = useWalletOld();
  const statusHeaders = {
    [WALLETCONNECT_STATUS_MAP.WAITING]: {
      color: '#8697FF',
      content: 'Please Sign on Your Ledger',
      signTextContent: 'Please Sign on Your Ledger',
      image: '/images/ledger-status/plug.jpg',
    },
    [WALLETCONNECT_STATUS_MAP.SIBMITTED]: {
      content: 'Transaction submitted',
      signTextContent: 'Signed',
      color: '#27C193',
      desc: 'Your transaction has been submitted',
      image: '/images/ledger-status/success.jpg',
    },
    [WALLETCONNECT_STATUS_MAP.FAILD]: {
      content: 'Transaction rejected',
      signTextContent: 'Rejected',
      color: '#EC5151',
      image: '/images/ledger-status/failed.jpg',
    },
  };
  const [connectStatus, setConnectStatus] = useState(
    WALLETCONNECT_STATUS_MAP.WAITING
  );
  const [getApproval, resolveApproval, rejectApproval] = useApproval();
  const chain = Object.values(CHAINS).find(
    (item) => item.id === (params.chainId || 1)
  )!;
  const { t } = useTranslation();
  const [isSignText, setIsSignText] = useState(false);
  const [result, setResult] = useState('');

  const handleCancel = () => {
    rejectApproval('user cancel');
  };

  const handleOK = () => {
    window.close();
  };

  const handleRetry = async () => {
    const account = await wallet.syncGetCurrentAccount()!;
    setConnectStatus(WALLETCONNECT_STATUS_MAP.WAITING);
    await wallet.requestKeyring(account.type, 'resend');
  };

  const handleClickResult = () => {
    const url = chain.scanLink.replace(/_s_/, result);
    openInTab(url);
  };

  const init = async () => {
    const account = params.isGnosis
      ? params.account!
      : await wallet.syncGetCurrentAccount()!;
    const approval = await getApproval();

    const isSignText = params.isGnosis
      ? true
      : approval?.data.approvalType !== 'SignTx';
    setIsSignText(isSignText);
    if (!isSignText) {
      const tx = approval.data?.params;
      if (tx) {
        const { nonce, from, chainId } = tx;
        const explain = await wallet.getExplainCache({
          nonce: Number(nonce),
          address: from,
          chainId: Number(chainId),
        });
        stats.report('signTransaction', {
          type: account.brandName,
          chainId: chain.serverId,
          category: KEYRING_CATEGORY_MAP[account.type],
          preExecSuccess: explain?.calcSuccess && explain?.pre_exec.success,
          createdBy: params?.$ctx?.ga ? 'rabby' : 'dapp',
          source: params?.$ctx?.ga?.source || '',
          trigger: params?.$ctx?.ga?.trigger || '',
        });
      }
    }
    eventBus.addEventListener(EVENTS.LEDGER.REJECT_APPROVAL, (data) => {
      rejectApproval(data, false, true);
    });
    eventBus.addEventListener(EVENTS.LEDGER.REJECTED, async (data) => {
      if (/DisconnectedDeviceDuringOperation/i.test(data)) {
        await rejectApproval('User rejected the request.');
        openInternalPageInTab('request-permission?type=ledger&from=approval');
      }
      setConnectStatus(WALLETCONNECT_STATUS_MAP.FAILD);
    });
    eventBus.addEventListener(EVENTS.SIGN_FINISHED, async (data) => {
      if (data.success) {
        setConnectStatus(WALLETCONNECT_STATUS_MAP.SIBMITTED);
        setResult(data.data);
        if (params.isGnosis) {
          const sigs = await wallet.getGnosisTransactionSignatures();
          if (sigs.length > 0) {
            await wallet.gnosisAddConfirmation(account.address, data.data);
          } else {
            await wallet.gnosisAddSignature(account.address, data.data);
            await wallet.postGnosisTransaction();
          }
        }
        ReactGA.event({
          category: 'Transaction',
          action: 'Submit',
          label: KEYRING_CLASS.HARDWARE.LEDGER,
        });
        const hasPermission = await wallet.checkLedgerHasHIDPermission();
        const isUseLedgerLive = await wallet.isUseLedgerLive();
        if (!hasPermission && !isUseLedgerLive) {
          await wallet.authorizeLedgerHIDPermission();
        }
        const pendingApprovalCount = await wallet.getPendingApprovalCount();
        resolveApproval(
          data.data,
          pendingApprovalCount > 1 ? false : !isSignText
        );
      } else {
        setConnectStatus(WALLETCONNECT_STATUS_MAP.FAILD);
      }
    });
  };

  useEffect(() => {
    init();
  }, []);
  const currentHeader = statusHeaders[connectStatus];

  return (
    <div className="ledger-waiting">
      <img
        src="/images/ledger-status/header.jpg"
        className="ledger-waiting__nav"
      />
      <div className="ledger-waiting__container">
        <div className="ledger-waiting__header">
          <h1
            style={{
              color: currentHeader.color,
              marginBottom: `${currentHeader.desc ? '8px' : '70px'}`,
            }}
          >
            {isSignText ? currentHeader.signTextContent : currentHeader.content}
          </h1>
          {currentHeader.desc && !isSignText && <p>{currentHeader.desc}</p>}
        </div>
        <img src={currentHeader.image} className="ledger-waiting__status" />
        {connectStatus === WALLETCONNECT_STATUS_MAP.WAITING && (
          <div className="ledger-waiting__tip">
            <p>Make sure:</p>
            <p>1. Plug your Ledger wallet into your computer</p>
            <p>2. Unlock Ledger and open the Ethereum app</p>
            <p className="ledger-waiting__tip-resend">
              Don't see the transaction on Ledger?{' '}
              <span className="underline cursor-pointer" onClick={handleRetry}>
                Resend transaction
              </span>
            </p>
          </div>
        )}
        {connectStatus === WALLETCONNECT_STATUS_MAP.SIBMITTED && !isSignText && (
          <div className="ledger-waiting__result">
            <img className="icon icon-chain" src={chain.logo} />
            <a
              href="javascript:;"
              className="tx-hash"
              onClick={handleClickResult}
            >
              {`${result.slice(0, 6)}...${result.slice(-4)}`}
              <SvgIconOpenExternal className="icon icon-external" />
            </a>
          </div>
        )}
        {(connectStatus === WALLETCONNECT_STATUS_MAP.SIBMITTED ||
          connectStatus === WALLETCONNECT_STATUS_MAP.FAILD) && (
          <div
            className="ledger-waiting__footer"
            style={{
              marginTop: `${
                connectStatus === WALLETCONNECT_STATUS_MAP.SIBMITTED
                  ? '55px'
                  : '120px'
              }`,
            }}
          >
            {connectStatus === WALLETCONNECT_STATUS_MAP.SIBMITTED && (
              <Button
                className="w-[200px]"
                type="primary"
                size="large"
                onClick={handleOK}
              >
                OK
              </Button>
            )}
            {connectStatus === WALLETCONNECT_STATUS_MAP.FAILD && (
              <>
                <Button
                  className="w-[200px]"
                  type="primary"
                  size="large"
                  onClick={handleRetry}
                >
                  Retry
                </Button>
                <Button type="link" onClick={handleCancel}>
                  {t('Cancel')}
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LedgerHardwareWaiting;
