import React, { useEffect, useState } from 'react';
import { Button, Tooltip } from 'antd';
import clsx from 'clsx';
import QRCode from 'qrcode.react';
import { useTranslation, Trans } from 'react-i18next';
import {
  KEYRING_TYPE,
  WATCH_ADDRESS_TYPE_CONTENT,
  WATCH_ADDRESS_CONNECT_TYPE,
  CHAINS,
} from 'consts';
import { Tx } from 'background/service/openapi';
import { useApproval, useWallet } from 'ui/utils';
import WatchKeyring from 'background/service/keyring/eth-watch-keyring';

interface ApprovalParams extends Tx {
  address: string;
}

const Scan = ({
  uri,
  typeId,
  chainId,
}: {
  uri: string;
  typeId: number;
  chainId: number;
}) => {
  const wallet = useWallet();
  const { address } = wallet.syncGetCurrentAccount()!;
  const typeContent = Object.values(WATCH_ADDRESS_TYPE_CONTENT).find(
    (item) => item.id === typeId
  )!;
  const chainName = Object.values(CHAINS).find((chain) => chain.id === chainId)!
    .name;
  const { t } = useTranslation();

  return (
    <div className="watchaddress-scan">
      <div className="watchaddress-scan__qrcode">
        <QRCode value={uri} size={208} />
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
              address: `${address.slice(0, 6)}...${address.slice(-4)}`,
              chainName,
            }}
          >
            Make sure you are using address <strong>{{ address }}</strong> on
            <strong>{{ chainName }}</strong>
          </Trans>
        </p>
        <p>3. {t('WatchGuideStep3')}</p>
      </div>
    </div>
  );
};

const WatchAddressWaiting = ({
  params,
  // currently doesn't support
  requestDefer,
}: {
  params: ApprovalParams;
  requestDefer: Promise<any>;
}) => {
  const wallet = useWallet();
  const { address } = wallet.syncGetCurrentAccount()!;
  const [currentType, setCurrentType] = useState(
    wallet.getWatchAddressPreference(address) || 0
  );
  const [qrcodeContent, setQrcodeContent] = useState('');
  const [currentTypeIndex, setCurrentTypeIndex] = useState(
    Object.values(WATCH_ADDRESS_TYPE_CONTENT).findIndex(
      (item) => item.id === currentType
    )
  );
  const keyring: WatchKeyring = wallet.getKeyringByType(
    KEYRING_TYPE.WatchAddressKeyring
  );
  const [, resolveApproval, rejectApproval] = useApproval();
  const { t } = useTranslation();
  const handleCancel = () => {
    rejectApproval('user cancel');
  };

  requestDefer
    .then((data) => resolveApproval(data, true))
    .catch(rejectApproval);

  const handleClickBrand = (id: number, index: number) => {
    setCurrentType(id);
    setCurrentTypeIndex(index);
  };

  const initWalletConnect = async () => {
    const connector = keyring.walletConnector;
    if (connector) {
      if (connector.connected) {
        await connector.killSession();
        await connector.createSession();
      }
      setQrcodeContent(connector.uri);
    }
  };

  useEffect(() => {
    const watchType = Object.values(WATCH_ADDRESS_TYPE_CONTENT).find(
      (item) => item.id === currentType
    )!;
    if (watchType.connectType === WATCH_ADDRESS_CONNECT_TYPE.WalletConnect) {
      initWalletConnect();
    }
  }, [currentType]);

  return (
    <div className="watchaddress">
      <div className="watchaddress-header">
        <p className="text-15 text-medium mb-24">
          {t('Choose your mobile wallet')}
        </p>
        <ul className="watchaddress-type-list">
          {Object.values(WATCH_ADDRESS_TYPE_CONTENT).map((item, index) => (
            <Tooltip title={item.name} key={item.id}>
              <li
                className={clsx({ active: currentType === item.id })}
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
        <Scan
          uri={qrcodeContent}
          typeId={currentType}
          chainId={params.chainId}
        />
        <footer>
          <div className="action-buttons flex justify-center">
            <Button
              type="primary"
              size="large"
              className="w-[172px]"
              onClick={handleCancel}
            >
              {t('Cancel')}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default WatchAddressWaiting;
