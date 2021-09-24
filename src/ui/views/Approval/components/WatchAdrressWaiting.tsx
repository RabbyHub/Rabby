import React, { useEffect, useState } from 'react';
import { Button, Tooltip } from 'antd';
import clsx from 'clsx';
import QRCode from 'qrcode.react';
import { useHistory } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import {
  WATCH_ADDRESS_TYPE_CONTENT,
  WATCH_ADDRESS_CONNECT_TYPE,
  CHAINS,
  CHAINS_ENUM,
  WALLETCONNECT_STATUS_MAP,
  EVENTS,
} from 'consts';
import { Tx } from 'background/service/openapi';
import { useApproval, useWallet, openInTab } from 'ui/utils';
import eventBus from '@/eventBus';
import { SvgIconOpenExternal, SvgIconRefresh } from 'ui/assets';

interface ApprovalParams extends Tx {
  address: string;
}

type Valueof<T> = T[keyof T];

const Scan = ({
  uri,
  typeId,
  chain,
  onRefresh,
}: {
  uri: string;
  typeId: number;
  chain: CHAINS_ENUM;
  onRefresh(): void;
}) => {
  const wallet = useWallet();
  const [address, setAddress] = useState<string | null>(null);
  const typeContent = Object.values(WATCH_ADDRESS_TYPE_CONTENT).find(
    (item) => item.id === typeId
  )!;
  const chainName = CHAINS[chain].name;
  const { t } = useTranslation();
  const handleRefresh = () => {
    onRefresh();
  };

  const init = async () => {
    const account = await wallet.syncGetCurrentAccount();
    setAddress(account.address);
  };

  useEffect(() => {
    init();
  });

  return (
    <div className="watchaddress-scan">
      <div className="watchaddress-scan__qrcode">
        <QRCode value={uri} size={208} />
      </div>
      <div className="watchaddress-scan__refresh">
        <SvgIconRefresh className="icon icon-refresh" onClick={handleRefresh} />
        <Button type="link" onClick={handleRefresh}>
          {t('Refresh QR Code')}
        </Button>
      </div>
      <div className="watchaddress-scan__guide">
        <p>
          1.{' '}
          <Trans i18nKey="WatchGuideStep1" values={{ name: typeContent.name }}>
            Open <strong>{{ name }}</strong> on your phone
          </Trans>
        </p>
        <p>
          2.{' '}
          <Trans
            i18nKey="WatchGuideStep2"
            values={{
              address: `${address?.slice(0, 6)}...${address?.slice(-4)}`,
              chainName,
            }}
          >
            Make sure you are using address <strong>{{ address }}</strong> on
            <strong>{{ chainName }}</strong>
          </Trans>
        </p>
        <p>3. {t('WatchGuideStep3')}</p>
      </div>
      <p className="watchaddress-scan__tip">Connect via WallletConnect</p>
    </div>
  );
};

const Process = ({
  chain,
  result,
  status,
  error,
  onRetry,
  onCancel,
}: {
  chain: CHAINS_ENUM;
  result: string;
  status: Valueof<typeof WALLETCONNECT_STATUS_MAP>;
  error: { code?: number; message?: string } | null;
  onRetry(): void;
  onCancel(): void;
}) => {
  const wallet = useWallet();
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
      title = t('Waiting for signature');
      titleColor = '#8697FF';
      description = (
        <p className="text-gray-content text-14 text-center">
          {t('Please sign on your phone')}
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
    const account = await wallet.syncGetCurrentAccount()!;
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
      {(status === WALLETCONNECT_STATUS_MAP.FAILD ||
        status === WALLETCONNECT_STATUS_MAP.REJECTED) && (
        <div className="watchaddress-process__buttons">
          <Button
            className="w-[200px]"
            type="primary"
            onClick={handleRetry}
            size="large"
          >
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
  const canNotSwitchStatus = [
    WALLETCONNECT_STATUS_MAP.CONNECTED,
    WALLETCONNECT_STATUS_MAP.SIBMITTED,
    WALLETCONNECT_STATUS_MAP.WAITING,
  ];
  const wallet = useWallet();
  const [address, setAddress] = useState<string | null>(null);
  const [connectStatus, setConnectStatus] = useState(
    WALLETCONNECT_STATUS_MAP.PENDING
  );
  const [connectError, setConnectError] = useState<null | {
    code?: number;
    message?: string;
  }>(null);
  const [currentType, setCurrentType] = useState(0);
  const [qrcodeContent, setQrcodeContent] = useState('');
  const [result, setResult] = useState('');
  const [currentTypeIndex, setCurrentTypeIndex] = useState(
    Object.values(WATCH_ADDRESS_TYPE_CONTENT).findIndex(
      (item) => item.id === currentType
    )
  );
  const [getApproval, resolveApproval, rejectApproval] = useApproval();
  const chain = Object.values(CHAINS).find(
    (item) => item.id === (params.chainId || 1)
  )!.enum;
  const { t } = useTranslation();
  const [isSignText, setIsSignText] = useState(false);

  const initWalletConnect = async () => {
    eventBus.addEventListener(EVENTS.WALLETCONNECT.INITED, ({ uri }) => {
      console.log('uri', uri);
      setQrcodeContent(uri);
    });
    eventBus.emit(EVENTS.broadcastToBackground, {
      method: EVENTS.WALLETCONNECT.INIT,
    });
  };

  const handleCancel = () => {
    rejectApproval('user cancel');
  };

  const handleRetry = async () => {
    await initWalletConnect();
    setConnectStatus(WALLETCONNECT_STATUS_MAP.PENDING);
    setConnectError(null);
  };

  const handleClickBrand = (id: number, index: number) => {
    if (canNotSwitchStatus.includes(connectStatus)) {
      return;
    }
    setCurrentType(id);
    setCurrentTypeIndex(index);
    setConnectStatus(WALLETCONNECT_STATUS_MAP.PENDING);
    setConnectError(null);
  };

  const handleRefreshQrCode = () => {
    initWalletConnect();
  };

  const init = async () => {
    const approval = await getApproval();
    const account = await wallet.syncGetCurrentAccount()!;

    setCurrentType(
      (await wallet.getWatchAddressPreference(account.address)) || 0
    );
    setIsSignText(approval?.approvalType !== 'SignTx');
    setAddress(account.address);
    eventBus.addEventListener(EVENTS.SIGN_FINISHED, async (data) => {
      if (data.success) {
        await wallet.setWatchAddressPreference(account.address, currentType);
        resolveApproval(data.data, !isSignText);
      } else {
        rejectApproval(data.errorMsg);
      }
    });

    eventBus.addEventListener(
      EVENTS.WALLETCONNECT.STATUS_CHANGED,
      ({ status, payload }) => {
        setConnectStatus(status);
        switch (status) {
          case WALLETCONNECT_STATUS_MAP.CONNECTED:
            break;
          case WALLETCONNECT_STATUS_MAP.FAILD:
          case WALLETCONNECT_STATUS_MAP.REJECTED:
            initWalletConnect();
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
  };

  useEffect(() => {
    const watchType = Object.values(WATCH_ADDRESS_TYPE_CONTENT).find(
      (item) => item.id === currentType
    )!;
    if (watchType.connectType === WATCH_ADDRESS_CONNECT_TYPE.WalletConnect) {
      initWalletConnect();
    }
  }, [currentType]);

  useEffect(() => {
    init();
  }, []);

  return (
    <div className="watchaddress">
      <div className="watchaddress-header">
        <p className="text-15 text-medium mb-24">
          {t('Choose your mobile wallet')}
        </p>
        <ul className="watchaddress-type-list">
          {Object.values(WATCH_ADDRESS_TYPE_CONTENT).map((item, index) => (
            <Tooltip
              title={
                canNotSwitchStatus.includes(connectStatus)
                  ? t('ConnectedCannotSwitch')
                  : item.name
              }
              key={item.id}
            >
              <li
                className={clsx({
                  active: currentType === item.id,
                  'cursor-not-allowed': canNotSwitchStatus.includes(
                    connectStatus
                  ),
                })}
                onClick={() => handleClickBrand(item.id, index)}
              >
                <img src={item.icon} className="brand-logo" />
              </li>
            </Tooltip>
          ))}
        </ul>
        <div
          className="select-corner"
          style={{
            transform: `translateX(${currentTypeIndex * 56}px)`,
          }}
        >
          <div className="select-corner__inner" />
        </div>
      </div>
      <div className="watchaddress-operation">
        {connectStatus === WALLETCONNECT_STATUS_MAP.PENDING ? (
          <Scan
            uri={qrcodeContent}
            typeId={currentType}
            chain={chain}
            onRefresh={handleRefreshQrCode}
          />
        ) : (
          <Process
            chain={chain}
            result={result}
            status={connectStatus}
            error={connectError}
            onRetry={handleRetry}
            onCancel={handleCancel}
          />
        )}
      </div>
    </div>
  );
};

export default WatchAddressWaiting;
