import React, { useState, useEffect } from 'react';
import { message } from 'antd';
import { useHistory, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DEFAULT_BRIDGE } from '@rabby-wallet/eth-walletconnect-keyring';
import { useWallet, useWalletRequest } from 'ui/utils';
import IconBack from 'ui/assets/gobackwhite.svg';
import { ScanCopyQRCode } from 'ui/component';
import eventBus from '@/eventBus';
import { WALLETCONNECT_STATUS_MAP, EVENTS } from 'consts';
import Mask from 'ui/assets/import-mask.png';
import './style.less';
import clsx from 'clsx';
const WalletConnectTemplate = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const location = useLocation<{ brand: any }>();
  const wallet = useWallet();
  const [connectStatus, setConnectStatus] = useState(
    WALLETCONNECT_STATUS_MAP.PENDING
  );
  const [connectError, setConnectError] = useState<null | {
    code?: number;
    message?: string;
  }>(null);
  const [result, setResult] = useState('');
  const [walletconnectUri, setWalletconnectUri] = useState('');
  const [showURL, setShowURL] = useState(false);
  const [stashId, setStashId] = useState<number | null>(null);
  const [bridgeURL, setBridgeURL] = useState(DEFAULT_BRIDGE);

  const { name, id, icon, brand, image } = location.state!.brand;

  const [run, loading] = useWalletRequest(wallet.importWalletConnect, {
    onSuccess(accounts) {
      history.replace({
        pathname: '/popup/import/success',
        state: {
          accounts,
          brand,
          image,
          title: t('Imported successfully'),
        },
      });
    },
    onError(err) {
      message.error(t(err?.message));
      handleImportByWalletconnect();
      return;
    },
  });

  const handleImportByWalletconnect = async () => {
    const { uri, stashId } = await wallet.initWalletConnect(brand, bridgeURL);
    await setWalletconnectUri(uri);
    await setStashId(stashId);
    eventBus.removeAllEventListeners(EVENTS.WALLETCONNECT.STATUS_CHANGED);
    eventBus.addEventListener(
      EVENTS.WALLETCONNECT.STATUS_CHANGED,
      ({ status, payload }) => {
        setConnectStatus(status);
        switch (status) {
          case WALLETCONNECT_STATUS_MAP.CONNECTED:
            setResult(payload);
            run(payload, brand, bridgeURL, stashId);
            break;
          case WALLETCONNECT_STATUS_MAP.FAILD:
          case WALLETCONNECT_STATUS_MAP.REJECTED:
            handleImportByWalletconnect();
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

  const handleClickBack = () => {
    if (history.length > 1) {
      history.goBack();
    } else {
      history.replace('/');
    }
  };

  const handleRefresh = () => {
    handleImportByWalletconnect();
  };

  const handleBridgeChange = (val: string) => {
    setBridgeURL(val);
  };

  useEffect(() => {
    handleImportByWalletconnect();
  }, [bridgeURL]);

  useEffect(() => {
    handleImportByWalletconnect();
  }, []);

  return (
    <div className="wallet-connect">
      <div className="create-new-header create-password-header h-[220px]">
        <img
          src={IconBack}
          className={clsx('goback', 'cursor-pointer')}
          onClick={handleClickBack}
        />
        <img
          className="unlock-logo w-[80px] h-[75px] mb-20 mx-auto"
          src={image}
        />
        <p className="text-24 mb-4 mt-0 text-white text-center font-bold">
          {t(name)}
        </p>
        <p className="text-14 mb-0 mt-4 text-white font-bold text-center">
          {t('Scan with your wallet app')}
        </p>
        <img src={Mask} className="mask" />
      </div>
      <ScanCopyQRCode
        showURL={showURL}
        changeShowURL={setShowURL}
        qrcodeURL={walletconnectUri}
        refreshFun={handleRefresh}
        bridgeURL={bridgeURL}
        onBridgeChange={handleBridgeChange}
        defaultBridge={DEFAULT_BRIDGE}
      />
    </div>
  );
};

export default WalletConnectTemplate;
