import React, { useEffect, useRef, useState } from 'react';
import { Button } from 'antd';
import { useHistory } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import { matomoRequestEvent } from '@/utils/matomo-request';
import { DEFAULT_BRIDGE } from '@rabby-wallet/eth-walletconnect-keyring';
import { Account } from 'background/service/preference';
import {
  CHAINS,
  CHAINS_ENUM,
  WALLETCONNECT_STATUS_MAP,
  EVENTS,
  WALLET_BRAND_CONTENT,
  SPECIFIC_TEXT_BRAND,
  KEYRING_CATEGORY_MAP,
} from 'consts';
import { ScanCopyQRCode } from 'ui/component';
import { useApproval, useWallet, openInTab } from 'ui/utils';
import eventBus from '@/eventBus';
import { SvgIconOpenExternal } from 'ui/assets';
import Mask from 'ui/assets/bg-watchtrade.png';

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

type Valueof<T> = T[keyof T];

const Scan = ({
  uri,
  chain,
  onRefresh,
  bridgeURL,
  onBridgeChange,
  defaultBridge,
  account,
}: {
  uri: string;
  chain: CHAINS_ENUM;
  bridgeURL: string;
  defaultBridge: string;
  account: Account;
  onRefresh(): void;
  onBridgeChange(val: string): void;
}) => {
  const [address, setAddress] = useState<string | null>(null);
  const [showURL, setShowURL] = useState(false);
  const [brandName, setBrandName] = useState<string | null>(null);
  const chainName = CHAINS[chain].name;
  const { t } = useTranslation();
  const handleRefresh = () => {
    onRefresh();
  };

  const init = async () => {
    setAddress(account.address);
    setBrandName(account.brandName);
  };
  const showSpecialText = brandName && SPECIFIC_TEXT_BRAND[brandName];
  const displayName = brandName && WALLET_BRAND_CONTENT[brandName].name;
  useEffect(() => {
    init();
  }, []);
  return (
    <div className="watchaddress-scan wallet-connect">
      <ScanCopyQRCode
        showURL={showURL}
        changeShowURL={setShowURL}
        qrcodeURL={uri || ''}
        refreshFun={handleRefresh}
        onBridgeChange={onBridgeChange}
        bridgeURL={bridgeURL}
        defaultBridge={defaultBridge}
        canChangeBridge={false}
      />
      <div className="watchaddress-scan__guide">
        <p>
          1.{' '}
          <Trans i18nKey="WatchGuideStep1" values={{ name: displayName }}>
            Open <strong>{{ name }}</strong>
          </Trans>
        </p>
        <p>
          2.{' '}
          {!showSpecialText && (
            <Trans
              i18nKey={'WatchGuideStep2'}
              values={{
                address: `${address?.slice(0, 6)}...${address?.slice(-4)}`,
                chainName,
              }}
            >
              Make sure you are using address <strong>{{ address }}</strong> on
              <strong>{{ chainName }}</strong>
            </Trans>
          )}
          {showSpecialText && (
            <Trans
              i18nKey={brandName && SPECIFIC_TEXT_BRAND[brandName]!.i18nKey}
            />
          )}
        </p>
        {!showSpecialText && <p>3. {t('WatchGuideStep3')}</p>}
      </div>
      <p className="watchaddress-scan__tip">Connect via WalletConnect</p>
    </div>
  );
};

const Process = ({
  chain,
  result,
  status,
  account,
  error,
  onRetry,
  onCancel,
}: {
  chain: CHAINS_ENUM;
  result: string;
  status: Valueof<typeof WALLETCONNECT_STATUS_MAP>;
  account: Account;
  error: { code?: number; message?: string } | null;
  onRetry(): void;
  onCancel(): void;
}) => {
  const [address, setAddress] = useState<null | string>(null);
  const { t } = useTranslation();
  const history = useHistory();
  const handleRetry = () => {
    onRetry();
  };
  const handleCancel = () => {
    onCancel();
  };
  const handleOK = () => {
    history.push('/');
  };
  const handleClickResult = () => {
    const url = CHAIN.scanLink.replace(/_s_/, result);
    openInTab(url);
  };
  const CHAIN = CHAINS[chain];
  let image = '';
  let title = '';
  let titleColor = '';
  let description = <></>;

  switch (status) {
    case WALLETCONNECT_STATUS_MAP.CONNECTED:
      image = './images/connection-success.png';
      title = t('Connected successfully');
      titleColor = '#27C193';
      description = (
        <p className="text-gray-content text-14 text-center">
          {t('Sending transaction to your phone')}
        </p>
      );
      break;
    case WALLETCONNECT_STATUS_MAP.WAITING:
      image = './images/connection-waiting.png';
      title = t('Please sign on your phone');
      titleColor = '#8697FF';
      description = (
        <p className="text-gray-content text-14 text-center">
          {t('Waiting for signature')}
        </p>
      );
      break;
    case WALLETCONNECT_STATUS_MAP.FAILD:
      image = './images/connection-failed.png';
      title = t('Connection failed');
      titleColor = '#F24822';
      description = (
        <p className="error-alert">
          {error &&
            error.code &&
            (error.code === 1000 ? t('Wrong chain') : t('Wrong address'))}
          {error &&
            error.code &&
            (error.code === 1000 ? (
              <p>
                <Trans
                  i18nKey="ChooseCorrectChain"
                  values={{
                    chain: CHAINS[chain].name,
                  }}
                />
              </p>
            ) : (
              <p>
                <Trans
                  i18nKey="ChooseCorrectAddress"
                  values={{
                    address: `${address?.slice(0, 6)}...${address?.slice(-4)}`,
                  }}
                >
                  Choose <strong>{{ address }}</strong> on your phone
                </Trans>
              </p>
            ))}
          {!error || (!error.code && !error) ? (
            <p>{t('No longer connected to the phone')}</p>
          ) : (
            <p>{error.message}</p>
          )}
        </p>
      );
      break;
    case WALLETCONNECT_STATUS_MAP.SIBMITTED:
      image = './images/tx-submitted.png';
      title = t('watch Transaction submitted');
      titleColor = '#27C193';
      description = (
        <p className="text-gray-content text-14 text-center">
          {t('Your transaction has been submitted')}
        </p>
      );
      break;
    case WALLETCONNECT_STATUS_MAP.REJECTED:
      image = './images/tx-rejected.png';
      title = t('Transaction rejected');
      titleColor = '#F24822';
      description = (
        <p className="error-alert">
          {t('You have refused to sign the transaction')}
        </p>
      );
      break;
  }

  const init = async () => {
    setAddress(account.address);
  };

  useEffect(() => {
    init();
  }, []);

  return (
    <div className="watchaddress-process">
      <img src={image} className="watchaddress-process__status" />
      <h2 className="watchaddress-process__title" style={{ color: titleColor }}>
        {title}
      </h2>
      {description}
      {result && status === WALLETCONNECT_STATUS_MAP.SIBMITTED && (
        <div className="watchaddress-process__result">
          <img className="icon icon-chain" src={CHAIN.logo} />
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
      {(status === WALLETCONNECT_STATUS_MAP.CONNECTED ||
        status === WALLETCONNECT_STATUS_MAP.FAILD ||
        status === WALLETCONNECT_STATUS_MAP.WAITING ||
        status === WALLETCONNECT_STATUS_MAP.REJECTED) && (
        <div className="watchaddress-process__buttons">
          <Button type="link" onClick={handleRetry}>
            {t('Retry')}
          </Button>
          <Button type="link" onClick={handleCancel}>
            {t('Cancel')}
          </Button>
        </div>
      )}
      {status === WALLETCONNECT_STATUS_MAP.SIBMITTED && (
        <div className="watchaddress-process__ok">
          <Button
            type="primary"
            className="w-[200px]"
            size="large"
            onClick={handleOK}
          >
            {t('OK')}
          </Button>
        </div>
      )}
    </div>
  );
};

const WatchAddressWaiting = ({ params }: { params: ApprovalParams }) => {
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
  const chain = Object.values(CHAINS).find(
    (item) => item.id === (params.chainId || 1)
  )!.enum;
  const { t } = useTranslation();
  const isSignTextRef = useRef(false);
  const [brandName, setBrandName] = useState<string | null>(null);
  const [bridgeURL, setBridge] = useState<string>(DEFAULT_BRIDGE);
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const explainRef = useRef<any | null>(null);

  const initWalletConnect = async () => {
    const account = params.isGnosis
      ? params.account!
      : (await wallet.syncGetCurrentAccount())!;
    const status = await wallet.getWalletConnectStatus(
      account.address,
      account.brandName
    );
    setConnectStatus(
      status === null ? WALLETCONNECT_STATUS_MAP.PENDING : status
    );
    setBrandName(account!.brandName);
    eventBus.addEventListener(EVENTS.WALLETCONNECT.INITED, ({ uri }) => {
      setQrcodeContent(uri);
    });
    const signingTx = await wallet.getSigningTx(params.signingTxId!);

    explainRef.current = signingTx?.explain;
    if (
      status !== WALLETCONNECT_STATUS_MAP.CONNECTED &&
      status !== WALLETCONNECT_STATUS_MAP.SIBMITTED
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
    await wallet.killWalletConnectConnector(account.address, account.brandName);
    await initWalletConnect();
    setConnectStatus(WALLETCONNECT_STATUS_MAP.PENDING);
    setConnectError(null);
  };

  const handleRefreshQrCode = () => {
    initWalletConnect();
  };

  const init = async () => {
    const approval = await getApproval();
    const account = params.isGnosis
      ? params.account!
      : (await wallet.syncGetCurrentAccount())!;
    const bridge = await wallet.getWalletConnectBridge(
      account.address,
      account.brandName
    );
    setCurrentAccount(account);
    setBridge(bridge || DEFAULT_BRIDGE);

    let isSignTriggered = false;
    const isText = params.isGnosis
      ? true
      : approval?.data.approvalType !== 'SignTx';
    isSignTextRef.current = isText;

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

            wallet.reportStats('signedTransaction', {
              type: account.brandName,
              chainId: CHAINS[chain].serverId,
              category: KEYRING_CATEGORY_MAP[account.type],
              success: true,
              preExecSuccess: explain
                ? explain?.calcSuccess && explain?.pre_exec.success
                : true,
              createBy: params?.$ctx?.ga ? 'rabby' : 'dapp',
              source: params?.$ctx?.ga?.source || '',
              trigger: params?.$ctx?.ga?.trigger || '',
            });
          }
        }
        resolveApproval(data.data, false, false, approval.id);
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

            wallet.reportStats('signedTransaction', {
              type: account.brandName,
              chainId: CHAINS[chain].serverId,
              category: KEYRING_CATEGORY_MAP[account.type],
              success: false,
              preExecSuccess: explain
                ? explain?.calcSuccess && explain?.pre_exec.success
                : true,
              createBy: params?.$ctx?.ga ? 'rabby' : 'dapp',
              source: params?.$ctx?.ga?.source || '',
              trigger: params?.$ctx?.ga?.trigger || '',
            });
          }
        }
        rejectApproval(data.errorMsg);
      }
    });

    eventBus.addEventListener(
      EVENTS.WALLETCONNECT.STATUS_CHANGED,
      async ({ status, payload }) => {
        setConnectStatus(status);
        if (
          status !== WALLETCONNECT_STATUS_MAP.FAILD &&
          status !== WALLETCONNECT_STATUS_MAP.REJECTED
        ) {
          if (!isText && !isSignTriggered) {
            const explain = explainRef.current;

            // const tx = approval.data?.params;
            if (explain) {
              // const { nonce, from, chainId } = tx;
              // const explain = await wallet.getExplainCache({
              //   nonce: Number(nonce),
              //   address: from,
              //   chainId: Number(chainId),
              // });

              wallet.reportStats('signTransaction', {
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
            matomoRequestEvent({
              category: 'Transaction',
              action: 'Submit',
              label: account.brandName,
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
          case WALLETCONNECT_STATUS_MAP.FAILD:
          case WALLETCONNECT_STATUS_MAP.REJECTED:
            if (payload.code) {
              setConnectError({ code: payload.code });
            } else {
              setConnectError((payload.params && payload.params[0]) || payload);
            }
            break;
          case WALLETCONNECT_STATUS_MAP.SIBMITTED:
            setResult(payload);
            break;
        }
      }
    );
    initWalletConnect();
  };

  const handleBridgeChange = async (val: string) => {
    const account = params.isGnosis
      ? params.account!
      : (await wallet.syncGetCurrentAccount())!;
    setBridge(val);
    eventBus.removeAllEventListeners(EVENTS.WALLETCONNECT.INITED);
    initWalletConnect();
    wallet.setWalletConnectBridge(account.address, account.brandName, val);
  };

  useEffect(() => {
    init();
  }, []);

  return (
    <div className="watchaddress">
      <div className="watchaddress-header">
        <div className="flex item-center justify-center icon-header pb-[26px]">
          <img
            className="w-[28px] h-[28px]"
            src={brandName && WALLET_BRAND_CONTENT[brandName]!.image}
          />
          <div className="text-24 ml-10">
            {t(brandName && WALLET_BRAND_CONTENT[brandName]!.name)}
          </div>
        </div>
        <img src={Mask} className="mask" />
      </div>
      <div className="watchaddress-operation">
        {connectStatus === WALLETCONNECT_STATUS_MAP.PENDING &&
        qrcodeContent &&
        currentAccount ? (
          <Scan
            uri={qrcodeContent}
            chain={chain}
            bridgeURL={bridgeURL}
            onBridgeChange={handleBridgeChange}
            onRefresh={handleRefreshQrCode}
            defaultBridge={DEFAULT_BRIDGE}
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
            />
          )
        )}
      </div>
    </div>
  );
};

export default WatchAddressWaiting;
