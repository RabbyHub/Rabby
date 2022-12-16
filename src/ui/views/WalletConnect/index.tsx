import React, { useState, useEffect } from 'react';
import { message } from 'antd';
import { useHistory, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DEFAULT_BRIDGE } from '@rabby-wallet/eth-walletconnect-keyring';
import { useWallet, useWalletRequest } from 'ui/utils';
import IconBack from 'ui/assets/icon-back.svg';
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
  const [result, setResult] = useState('');
  const [walletconnectUri, setWalletconnectUri] = useState('');
  const [showURL, setShowURL] = useState(false);
  const [bridgeURL, setBridgeURL] = useState(DEFAULT_BRIDGE);
  const [brand, setBrand] = useState(location.state?.brand || {});
  const [ready, setReady] = useState(false);

  const [run, loading] = useWalletRequest(wallet.importWalletConnect, {
    onSuccess(accounts) {
      history.replace({
        pathname: '/popup/import/success',
        state: {
          accounts,
          brand: brand.brand,
          image: brand.image,
          editing: true,
          title: t('Imported Successfully'),
          importedAccount: true,
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
    const { uri, stashId } = await wallet.initWalletConnect(
      brand.brand,
      bridgeURL
    );
    setWalletconnectUri(uri);
    await wallet.setPageStateCache({
      path: '/import/wallet-connect',
      params: {},
      states: {
        uri,
        stashId,
        brand,
        bridgeURL,
      },
    });
    eventBus.removeAllEventListeners(EVENTS.WALLETCONNECT.STATUS_CHANGED);
    eventBus.addEventListener(
      EVENTS.WALLETCONNECT.STATUS_CHANGED,
      ({ status, payload }) => {
        switch (status) {
          case WALLETCONNECT_STATUS_MAP.CONNECTED:
            setResult(payload);
            run(
              payload,
              brand.brand,
              bridgeURL,
              stashId === null ? undefined : stashId
            );
            break;
          case WALLETCONNECT_STATUS_MAP.FAILD:
          case WALLETCONNECT_STATUS_MAP.REJECTED:
            handleImportByWalletconnect();
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
    if (val !== bridgeURL) {
      setBridgeURL(val);
    }
  };

  useEffect(() => {
    if (ready) handleImportByWalletconnect();
  }, [bridgeURL]);

  useEffect(() => {
    const alertTransportError = () => {
      message.error(t('Please check your network or refresh the QR code'));
    };

    eventBus.addEventListener(
      EVENTS.WALLETCONNECT.TRANSPORT_ERROR,
      alertTransportError
    );

    return () => {
      eventBus.removeAllEventListeners(EVENTS.WALLETCONNECT.TRANSPORT_ERROR);
    };
  }, []);

  const init = async () => {
    const cache = await wallet.getPageStateCache();
    if (cache && cache.path === history.location.pathname) {
      const { states } = cache;
      if (states.uri) setWalletconnectUri(states.uri);
      if (states.brand) {
        setBrand(states.brand);
      }
      if (states.data) {
        run(
          states.data.payload,
          states.brand.brand,
          states.bridgeURL,
          states.stashId
        );
      }
      if (states.bridgeURL && states.bridgeURL !== bridgeURL) {
        setBridgeURL(states.bridgeURL);
      }
    } else {
      handleImportByWalletconnect();
    }
    setReady(true);
  };

  useEffect(() => {
    init();
    return () => {
      wallet.clearPageStateCache();
    };
  }, []);

  return (
    <div className="wallet-connect pb-0">
      <div className="create-new-header create-password-header h-[220px] pt-[16px] pb-[30px]">
        <img
          src={IconBack}
          className="icon-back mb-0 relative z-10"
          onClick={handleClickBack}
        />
        <img
          className="unlock-logo w-[80px] h-[80px] mb-16 mx-auto"
          src={brand.image}
        />
        <p className="text-24 mb-8 mt-0 text-white text-center font-bold">
          {t(brand.name)}
        </p>
        <p className="text-15 mb-0 mt-4 text-white font-medium text-center">
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
