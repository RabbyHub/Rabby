import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Input, Form, message } from 'antd';
import { useHistory, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import QRCode from 'qrcode.react';
import clsx from 'clsx';
import { isValidAddress } from 'ethereumjs-util';
import WalletConnect from '@walletconnect/client';
import { StrayPageWithButton } from 'ui/component';
import { useWallet, useWalletRequest, useHover } from 'ui/utils';
import { openInternalPageInTab } from 'ui/utils/webapi';
import { Account } from 'background/service/preference';
import IconCopy from 'ui/assets/urlcopy.svg';
import IconRefresh from 'ui/assets/urlrefresh.svg';
import ClipboardJS from 'clipboard';
import IconSuccess from 'ui/assets/success.svg';
import IconBridgeChange from 'ui/assets/bridgechange.svg';
import OpenApiModal from './Component/OpenApiModal';
import IconBack from 'ui/assets/gobackwhite.svg';
import IconQRCodeRefresh from 'ui/assets/qrcoderefresh.svg';
import './style.less';
const WalletConnectTemplate = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const location = useLocation<{ brand: any }>();
  const wallet = useWallet();
  const [form] = Form.useForm();
  const [isHovering, hoverProps] = useHover();
  const [disableKeydown, setDisableKeydown] = useState(false);
  const connector = useRef<WalletConnect>();
  const [walletconnectUri, setWalletconnectUri] = useState('');
  const [ensResult, setEnsResult] = useState<null | {
    addr: string;
    name: string;
  }>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [showURL, setShowURL] = useState(false);
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [showOpenApiModal, setShowOpenApiModal] = useState(false);
  const [isDefaultWallet, setIsDefaultWallet] = useState(false);
  const [showRefresh, setShowRefresh] = useState(false);
  const [run, loading] = useWalletRequest(wallet.importWatchAddress, {
    onSuccess(accounts) {
      setDisableKeydown(false);
      history.replace({
        pathname: '/import/success',
        state: {
          accounts,
          title: t('Successfully created'),
        },
      });
    },
    onError(err) {
      setDisableKeydown(false);
      form.setFields([
        {
          name: 'address',
          errors: [err?.message || t('Not a valid address')],
        },
      ]);
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
      bridge: 'https://wcbridge.debank.com',
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
        form.setFieldsValue({
          address: accounts[0],
        });
        await connector.current?.killSession();
        setWalletconnectUri('');
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

  const handleValuesChange = async ({ address }: { address: string }) => {
    setTags([]);
    if (!isValidAddress(address)) {
      try {
        const result = await wallet.openapi.getEnsAddressByName(address);
        setDisableKeydown(true);
        if (result && result.addr) {
          setEnsResult(result);
        }
      } catch (e) {
        setEnsResult(null);
      }
    } else {
      setEnsResult(null);
    }
  };

  const handleNextClick = () => {
    const address = form.getFieldValue('address');
    run(address);
  };

  const handleClickBack = () => {
    if (history.length > 1) {
      history.goBack();
    } else {
      history.replace('/');
    }
  };
  const handleCopyCurrentAddress = () => {
    const clipboard = new ClipboardJS('.main', {
      text: function () {
        return currentAccount!.address;
      },
    });

    clipboard.on('success', () => {
      setCopySuccess(true);
      setTimeout(() => {
        setCopySuccess(false);
      }, 1000);
      message.success({
        icon: <img src={IconSuccess} className="icon icon-success" />,
        content: t('Copied'),
        duration: 0.5,
      });
      clipboard.destroy();
    });
  };
  useEffect(() => {
    handleLoadCache();
    handleImportByWalletconnect();
    return () => {
      wallet.clearPageStateCache();
    };
  }, []);
  const { name, id, icon, brand, image } = location.state!.brand;
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
      <div className="button-container">
        <div
          className={showURL ? '' : 'active'}
          onClick={() => setShowURL(false)}
        >
          {t('QR code')}
        </div>
        <div
          className={showURL ? 'active' : ''}
          onClick={() => setShowURL(true)}
        >
          {t('URL')}
        </div>
      </div>
      {walletconnectUri && !showURL && (
        <div className="qrcode" {...hoverProps}>
          <QRCode value={walletconnectUri} size={170} />
          {isHovering && (
            <div className="refresh-container">
              <img
                className="qrcode-refresh"
                src={IconQRCodeRefresh}
                onClick={handleImportByWalletconnect}
              />
            </div>
          )}
        </div>
      )}
      {walletconnectUri && showURL && (
        <div className="url-container">
          <Input.TextArea
            className="h-[200px] w-[336px] p-16 m-32 mt-0 mb-24"
            spellCheck={false}
            value={walletconnectUri}
          />
          <img
            src={IconRefresh}
            onClick={handleImportByWalletconnect}
            className="icon-refresh"
          />
          <img
            src={IconCopy}
            onClick={handleCopyCurrentAddress}
            className={clsx('icon-copy-wallet', { success: copySuccess })}
          />
          <div
            className="change-bridge"
            onClick={() => setShowOpenApiModal(true)}
          >
            <img src={IconBridgeChange} />
            {t('Change bridge server')}
          </div>
        </div>
      )}
      <OpenApiModal
        visible={showOpenApiModal}
        onFinish={() => setShowOpenApiModal(false)}
        onCancel={() => setShowOpenApiModal(false)}
      />
    </div>
  );
};

export default WalletConnectTemplate;
