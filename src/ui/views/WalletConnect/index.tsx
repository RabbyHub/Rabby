import React, { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import { useHistory, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getCurrentTab, useWallet, useWalletRequest } from 'ui/utils';
import IconBack from 'ui/assets/icon-back.svg';
import { ScanCopyQRCode } from 'ui/component';
import eventBus from '@/eventBus';
import {
  WALLETCONNECT_STATUS_MAP,
  EVENTS,
  WALLET_BRAND_CONTENT,
  WALLET_BRAND_CATEGORY,
  KEYRING_CLASS,
} from 'consts';
import './style.less';
import clsx from 'clsx';
import IconWalletConnect from 'ui/assets/walletlogo/walletconnect.svg';
import { useSessionStatus } from '@/ui/component/WalletConnect/useSessionStatus';
import { useBrandNameHasWallet } from '@/ui/component/WalletConnect/useBrandNameHasWallet';
import { getOriginFromUrl, safeJSONParse } from '@/utils';
import { ConnectedSite } from '@/background/service/permission';
import { findChainByEnum } from '@/utils/chain';
import { useRepeatImportConfirm } from '@/ui/utils/useRepeatImportConfirm';

const WalletConnectName = WALLET_BRAND_CONTENT['WALLETCONNECT']?.name;

const WalletConnectTemplate = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const location = useLocation<{ brand: any }>();
  const wallet = useWallet();
  const [result, setResult] = useState('');
  const [walletconnectUri, setWalletconnectUri] = useState('');
  const [showURL, setShowURL] = useState(false);
  const [bridgeURL, setBridgeURL] = useState('');
  const [brand, setBrand] = useState(location.state?.brand || {});
  const [ready, setReady] = useState(false);
  const { status: sessionStatus, currAccount } = useSessionStatus();
  const [runParams, setRunParams] = useState<
    Parameters<typeof run> | undefined
  >();
  const [curStashId, setCurStashId] = useState<number | null>();
  const siteRef = React.useRef<ConnectedSite | null>(null);
  const { show, contextHolder } = useRepeatImportConfirm();

  const getCurrentSite = useCallback(async () => {
    const tab = await getCurrentTab();
    if (!tab.id || !tab.url) return;
    const domain = getOriginFromUrl(tab.url);
    const current = await wallet.getCurrentSite(tab.id, domain);
    siteRef.current = current;
  }, []);

  const [run, loading] = useWalletRequest(wallet.importWalletConnect, {
    onSuccess(accounts) {
      history.replace({
        pathname: '/popup/import/success',
        state: {
          accounts,
          brand: brand.brand,
          image: brand.image,
          editing: true,
          title: t('page.newAddress.walletConnect.connectedSuccessfully'),
          importedAccount: true,
        },
      });
    },
    onError(err) {
      if (err.message?.includes?.('DuplicateAccountError')) {
        const address = safeJSONParse(err.message)?.address;
        show({
          address,
          type: KEYRING_CLASS.WALLETCONNECT,
        });
      } else {
        message.error(t(err?.message as any));
        handleImportByWalletconnect();
      }
    },
  });

  const handleRun = async (options: Parameters<typeof run>) => {
    const [payload, brandName, account] = options as any;
    const {
      peer: { metadata },
    } = payload as any;

    options[0] = account.address;
    if (brandName === WALLET_BRAND_CONTENT['WALLETCONNECT'].brand) {
      if (metadata?.name) {
        options[1] = currAccount!.brandName;
        options[4] = metadata.name;
        options[5] = metadata.icons?.[0];
      }
    }
    run(...options);
  };

  const handleImportByWalletconnect = async () => {
    const chain = findChainByEnum(siteRef.current?.chain);
    const { stashId } = await wallet.initWalletConnect(
      brand.brand,
      curStashId,
      chain?.id
    );
    setCurStashId(stashId);

    eventBus.removeAllEventListeners(EVENTS.WALLETCONNECT.STATUS_CHANGED);
    eventBus.addEventListener(
      EVENTS.WALLETCONNECT.STATUS_CHANGED,
      ({ status, account, payload }) => {
        switch (status) {
          case WALLETCONNECT_STATUS_MAP.CONNECTED:
            setResult(account.address);
            setRunParams([
              payload,
              brand.brand,
              account,
              stashId === null ? undefined : stashId,
            ]);
            break;
          case WALLETCONNECT_STATUS_MAP.FAILED:
          case WALLETCONNECT_STATUS_MAP.REJECTED:
            handleImportByWalletconnect();
            break;
          case WALLETCONNECT_STATUS_MAP.SUBMITTED:
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
      message.error(t('page.newAddress.walletConnect.qrCodeError'));
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
    eventBus.addEventListener(EVENTS.WALLETCONNECT.INITED, ({ uri }) => {
      setWalletconnectUri(uri);
    });
    await getCurrentSite();
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
      {contextHolder}
      <div className="create-new-header create-password-header h-[180px] py-[20px] dark:bg-r-blue-disable">
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
          {t('page.newAddress.walletConnect.connectYour')} {brandName}
          {hasWallet ? '' : ' Wallet'}
        </p>
        <p className="text-13 leading-none mb-0 text-white font-medium text-center">
          {t('page.newAddress.walletConnect.viaWalletConnect')}
        </p>
      </div>
      <ScanCopyQRCode
        showURL={showURL}
        changeShowURL={setShowURL}
        qrcodeURL={walletconnectUri}
        refreshFun={handleRefresh}
        canChangeBridge={false}
        brandName={brandName}
      />
    </div>
  );
};

export default WalletConnectTemplate;
