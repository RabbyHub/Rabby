import React, { useState, useEffect } from 'react';
import { message } from 'antd';
import { useHistory, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DEFAULT_BRIDGE } from '@rabby-wallet/eth-walletconnect-keyring';
import { useWallet, useWalletRequest } from 'ui/utils';
import IconBack from 'ui/assets/icon-back.svg';
import { ScanCopyQRCode } from 'ui/component';
import eventBus from '@/eventBus';
import {
  WALLETCONNECT_STATUS_MAP,
  EVENTS,
  WALLET_BRAND_CONTENT,
  WALLET_BRAND_CATEGORY,
} from 'consts';
import Mask from 'ui/assets/import-mask.png';
import './style.less';
import clsx from 'clsx';
import IconWalletConnect from 'ui/assets/walletlogo/walletconnect.svg';
import { useSessionStatus } from '@/ui/component/WalletConnect/useSessionStatus';
import { useBrandNameHasWallet } from '@/ui/component/WalletConnect/useBrandNameHasWallet';

const WalletConnectName = WALLET_BRAND_CONTENT['WALLETCONNECT']?.name;

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
  const { status: sessionStatus, currAccount } = useSessionStatus();
  const [runParams, setRunParams] = useState<
    Parameters<typeof run> | undefined
  >();
  const [curStashId, setCurStashId] = useState<number | null>();

  const [run, loading] = useWalletRequest(wallet.importWalletConnect, {
    onSuccess(accounts) {
      history.replace({
        pathname: '/popup/import/success',
        state: {
          accounts,
          brand: brand.brand,
          image: brand.image,
          editing: true,
          title: 'Connected successfully',
          importedAccount: true,
        },
      });
    },
    onError(err) {
      if (!err?.message.includes('duplicate')) {
        message.error(t(err?.message));
      }
      handleImportByWalletconnect();
      return;
    },
  });

  const handleRun = async (options: Parameters<typeof run>) => {
    const [payload, brandName] = options;
    const { account, peerMeta } = payload as any;

    options[0] = account;
    if (brandName === WALLET_BRAND_CONTENT['WALLETCONNECT'].brand) {
      if (peerMeta?.name) {
        options[1] = currAccount!.brandName;
        options[4] = peerMeta.name;
        options[5] = peerMeta.icons?.[0];
      }
    }
    run(...options);
  };

  const handleImportByWalletconnect = async () => {
    const { uri, stashId } = await wallet.initWalletConnect(
      brand.brand,
      curStashId
    );
    setCurStashId(stashId);
    setWalletconnectUri(uri);
    // await wallet.setPageStateCache({
    //   path: '/import/wallet-connect',
    //   params: {},
    //   states: {
    //     uri,
    //     stashId,
    //     brand,
    //     bridgeURL,
    //   },
    // });
    eventBus.removeAllEventListeners(EVENTS.WALLETCONNECT.STATUS_CHANGED);
    eventBus.addEventListener(
      EVENTS.WALLETCONNECT.STATUS_CHANGED,
      ({ status, payload }) => {
        switch (status) {
          case WALLETCONNECT_STATUS_MAP.CONNECTED:
            setResult(payload.account);
            setRunParams([
              payload,
              brand.brand,
              bridgeURL,
              stashId === null ? undefined : stashId,
            ]);
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

  useEffect(() => {
    if (sessionStatus === 'CONNECTED' && runParams?.length) {
      handleRun(runParams);
    } else {
      setRunParams(undefined);
    }
  }, [sessionStatus, runParams]);

  const handleClickBack = () => {
    if (history.length > 1) {
      history.goBack();
      sessionStorage.setItem(
        'SELECTED_WALLET_TYPE',
        WALLET_BRAND_CONTENT?.[brand.brand]?.category ||
          WALLET_BRAND_CATEGORY.MOBILE
      );
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
      if (
        sessionStatus === 'BRAND_NAME_ERROR' ||
        sessionStatus === 'ADDRESS_DUPLICATE'
      )
        return;
      message.error(t('Please check your network or refresh the QR code'));
    };

    eventBus.addEventListener(
      EVENTS.WALLETCONNECT.TRANSPORT_ERROR,
      alertTransportError
    );

    return () => {
      eventBus.removeAllEventListeners(EVENTS.WALLETCONNECT.TRANSPORT_ERROR);
    };
  }, [sessionStatus]);

  const init = async () => {
    // const cache = await wallet.getPageStateCache();
    // if (cache && cache.path === history.location.pathname) {
    //   const { states } = cache;
    //   if (states.uri) setWalletconnectUri(states.uri);
    //   if (states.brand) {
    //     setBrand(states.brand);
    //   }
    //   if (states.data) {
    //     setRunParams([
    //       states.data.payload,
    //       states.brand.brand,
    //       states.bridgeURL,
    //       states.stashId,
    //     ]);
    //   }
    //   if (states.bridgeURL && states.bridgeURL !== bridgeURL) {
    //     setBridgeURL(states.bridgeURL);
    //   }
    // } else {
    //   handleImportByWalletconnect();
    // }

    handleImportByWalletconnect();
    setReady(true);
  };

  useEffect(() => {
    init();
    return () => {
      wallet.clearPageStateCache();
    };
  }, []);

  const brandName = brand.name === WalletConnectName ? 'Mobile' : brand.name;
  const hasWallet = useBrandNameHasWallet(brandName);

  return (
    <div className="wallet-connect pb-0">
      <div className="create-new-header create-password-header h-[180px] py-[20px]">
        <img
          src={IconBack}
          className="icon-back mb-0 relative z-10"
          onClick={handleClickBack}
        />
        <div className="relative w-[60px] h-[60px] mb-16 mx-auto mt-[-4px]">
          <img className="unlock-logo w-full h-full" src={brand.image} />
          <img
            className={clsx(
              'w-[24px] h-[24px] absolute bottom-[-4px] right-[-8px]',
              { hidden: brand.name === WalletConnectName }
            )}
            src={IconWalletConnect}
          />
        </div>
        <p className="text-[17px] leading-none mb-8 mt-0 text-white text-center font-bold">
          Connect your {brandName}
          {hasWallet ? '' : ' Wallet'}
        </p>
        <p className="text-13 leading-none mb-0 text-white font-medium text-center">
          {'via Wallet Connect'}
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
        canChangeBridge={false}
        brandName={brandName}
      />
    </div>
  );
};

export default WalletConnectTemplate;
