import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Input, Form, Modal } from 'antd';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import QRCode from 'qrcode.react';
import QRCodeReader from 'ui/component/QRCodeReader';
import { isValidAddress } from 'ethereumjs-util';
import WalletConnect from '@walletconnect/client';
import { StrayPageWithButton } from 'ui/component';
import { useWallet, useWalletRequest } from 'ui/utils';
import { openInternalPageInTab } from 'ui/utils/webapi';
import WatchLogo from 'ui/assets/waitcup.svg';
import IconWalletconnect from 'ui/assets/walletconnect.svg';
import IconScan from 'ui/assets/scan.svg';
import IconArrowDown from 'ui/assets/big-arrow-down.svg';
import IconEnter from 'ui/assets/enter.svg';
import IconChecked from 'ui/assets/checked.svg';

const ImportWatchAddress = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const wallet = useWallet();
  const [form] = Form.useForm();
  const [disableKeydown, setDisableKeydown] = useState(false);
  const [walletconnectModalVisible, setWalletconnectModalVisible] = useState(
    false
  );
  const [QRScanModalVisible, setQRScanModalVisible] = useState(false);
  const connector = useRef<WalletConnect>();
  const [walletconnectUri, setWalletconnectUri] = useState('');
  const [ensResult, setEnsResult] = useState<null | {
    addr: string;
    name: string;
  }>(null);
  const [tags, setTags] = useState<string[]>([]);

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
        setWalletconnectModalVisible(false);
        setWalletconnectUri('');
      }
    });
    connector.current.on('disconnect', () => {
      setWalletconnectModalVisible(false);
    });
    await connector.current.createSession();
    setWalletconnectUri(connector.current.uri);
    setWalletconnectModalVisible(true);
  };

  const handleWalletconnectModalCancel = () => {
    if (connector.current && connector.current.connected) {
      connector.current.killSession();
    }
    setWalletconnectModalVisible(false);
  };

  const handleScanQRCodeSuccess = (data) => {
    form.setFieldsValue({
      address: data,
    });
    setQRScanModalVisible(false);
    wallet.clearPageStateCache();
  };

  const handleQRScanModalCancel = () => {
    setQRScanModalVisible(false);
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

  const handleImportByQrcode = () => {
    setQRScanModalVisible(true);
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

  useEffect(() => {
    handleLoadCache();
    return () => {
      wallet.clearPageStateCache();
    };
  }, []);

  return (
    <StrayPageWithButton
      onSubmit={handleNextClick}
      spinning={loading}
      form={form}
      hasBack
      hasDivider
      noPadding
      className="import-watchmode"
      formProps={{
        onValuesChange: handleValuesChange,
      }}
      disableKeyDownEvent={disableKeydown}
      onBackClick={handleClickBack}
    >
      <header className="create-new-header create-password-header h-[264px]">
        <img
          className="rabby-logo"
          src="/images/logo-gray.png"
          alt="rabby logo"
        />
        <img
          className="unlock-logo w-[80px] h-[75px] mb-20 mx-auto"
          src={WatchLogo}
        />
        <p className="text-24 mb-4 mt-0 text-white text-center font-bold">
          {t('Watch Mode')}
        </p>
        <p className="text-14 mb-0 mt-4 text-white opacity-80 text-center">
          {t('Enter an address without providing private key')}
        </p>
        <img src="/images/watch-mask.png" className="mask" />
      </header>
      <div className="relative">
        <Form.Item
          className="pt-32 px-20"
          name="address"
          rules={[{ required: true, message: t('Please input address') }]}
        >
          <Input
            placeholder="Address / ENS"
            size="large"
            maxLength={44}
            autoFocus
            spellCheck={false}
            suffix={
              ensResult ? (
                <img src={IconChecked} className="icon icon-checked" />
              ) : null
            }
          />
        </Form.Item>
        {tags.length > 0 && (
          <ul className="tags">
            {tags.map((tag) => (
              <li key={tag}>{tag}</li>
            ))}
          </ul>
        )}
        {ensResult && (
          <div
            className="ens-search"
            onClick={() => handleConfirmENS(ensResult.addr)}
          >
            <div className="ens-search__inner">
              {ensResult.addr}
              <img className="icon icon-enter" src={IconEnter} />
            </div>
          </div>
        )}
      </div>
      <div className="flex justify-between px-20">
        <div
          className="w-[172px] import-watchmode__button"
          onClick={handleImportByWalletconnect}
        >
          <img src={IconWalletconnect} className="icon icon-walletconnect" />
          {t('Scan via mobile wallet')}
        </div>
        <div
          className="w-[172px] import-watchmode__button"
          onClick={handleImportByQrcode}
        >
          <img src={IconScan} className="icon icon-walletconnect" />
          {t('Scan via PC camera')}
        </div>
      </div>
      <Modal
        className="walletconnect-modal"
        visible={walletconnectModalVisible}
        onCancel={handleWalletconnectModalCancel}
        footer={null}
        width={360}
      >
        <p className="guide">{t('ScanQRcodesWithWalletConnect')}</p>
        <div className="symbol">
          <img src={IconWalletconnect} className="icon icon-walletconnect" />
          Wallet connect
        </div>
        {walletconnectUri && (
          <div className="qrcode">
            <QRCode value={walletconnectUri} size={176} />
          </div>
        )}
      </Modal>
      <Modal
        className="walletconnect-modal"
        visible={QRScanModalVisible}
        onCancel={handleQRScanModalCancel}
        footer={null}
        width={360}
        destroyOnClose
      >
        <p className="guide">
          {t('Please point the QR code in your phone at the screen')}
        </p>
        <img src={IconArrowDown} className="icon icon-arrow-down" />
        <div className="qrcode">
          <QRCodeReader
            width={176}
            height={176}
            onSuccess={handleScanQRCodeSuccess}
            onError={handleScanQRCodeError}
          />
        </div>
      </Modal>
    </StrayPageWithButton>
  );
};

export default ImportWatchAddress;
