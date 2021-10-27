import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Form, message } from 'antd';
import { useHistory, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import WalletConnect from '@walletconnect/client';
import { useWallet, useWalletRequest } from 'ui/utils';
import { openInternalPageInTab } from 'ui/utils/webapi';
import IconBack from 'ui/assets/gobackwhite.svg';
import { ScanCopyQRCode } from 'ui/component';
import './style.less';
const WalletConnectTemplate = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const location = useLocation<{ brand: any }>();
  const wallet = useWallet();
  const [form] = Form.useForm();
  const connector = useRef<WalletConnect>();
  const [walletconnectUri, setWalletconnectUri] = useState('');
  const [ensResult, setEnsResult] = useState<null | {
    addr: string;
    name: string;
  }>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [showURL, setShowURL] = useState(false);
  const { name, id, icon, brand, image } = location.state!.brand;

  const [run, loading] = useWalletRequest(wallet.importWatchAddress, {
    onSuccess(accounts) {
      history.replace({
        pathname: '/import/success',
        state: {
          accounts,
          brand,
          image,
          title: t('Successfully created'),
        },
      });
    },
    onError(err) {
      message.error(t(err?.message));
      handleImportByWalletconnect();
      return;
    },
  });

  const handleConfirmENS = (result: string) => {
    form.setFieldsValue({
      address: result,
    });
    setTags([`ENS: ${ensResult!.name}`]);
    setEnsResult(null);
  };

  const handleKeyDown = useMemo(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'enter') {
        if (ensResult) {
          e.preventDefault();
          handleConfirmENS(ensResult.addr);
        }
      }
    };
    return handler;
  }, [ensResult]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  const handleImportByWalletconnect = async () => {
    localStorage.removeItem('walletconnect');
    connector.current = new WalletConnect({
      bridge: 'https://wcbridge.rabby.io',
      clientMeta: {
        description: t('appDescription'),
        url: 'https://rabby.io',
        icons: ['https://rabby.io/assets/images/logo.png'],
        name: 'Rabby',
      },
    });
    connector.current.on('connect', async (error, payload) => {
      if (error) {
        handleImportByWalletconnect();
      } else {
        const { accounts } = payload.params[0];
        await connector.current?.killSession();
        if (accounts[0]) {
          run(accounts[0]);
        }
      }
    });
    await connector.current.createSession();
    setWalletconnectUri(connector.current.uri);
  };

  const handleScanQRCodeSuccess = (data) => {
    form.setFieldsValue({
      address: data,
    });
    wallet.clearPageStateCache();
  };

  const handleScanQRCodeError = async () => {
    await wallet.setPageStateCache({
      path: history.location.pathname,
      params: {},
      states: form.getFieldsValue(),
    });
    openInternalPageInTab('request-permission?type=camera');
  };

  const handleLoadCache = async () => {
    const cache = await wallet.getPageStateCache();
    if (cache && cache.path === history.location.pathname) {
      form.setFieldsValue(cache.states);
    }
  };

  const handleClickBack = () => {
    if (history.length > 1) {
      history.goBack();
    } else {
      history.replace('/');
    }
  };
  useEffect(() => {
    handleLoadCache();
    handleImportByWalletconnect();
    return () => {
      wallet.clearPageStateCache();
    };
  }, []);
  return (
    <div className="wallet-connect">
      <div className="create-new-header create-password-header h-[220px]">
        <img src={IconBack} className="goback" onClick={handleClickBack} />
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
        <img src="/images/watch-mask.png" className="mask" />
      </div>
      <ScanCopyQRCode
        showURL={showURL}
        changeShowURL={setShowURL}
        qrcodeURL={walletconnectUri}
        refreshFun={handleImportByWalletconnect}
      />
    </div>
  );
};

export default WalletConnectTemplate;
