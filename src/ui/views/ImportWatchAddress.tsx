import React, { useState, useRef } from 'react';
import { Input, Form, Modal } from 'antd';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import QRCode from 'qrcode.react';
import WalletConnect from '@walletconnect/client';
import { StrayPageWithButton } from 'ui/component';
import { useWallet, useWalletRequest } from 'ui/utils';
import WatchLogo from 'ui/assets/watch-logo.svg';
import IconWalletconnect from 'ui/assets/walletconnect.svg';
import IconScan from 'ui/assets/scan.svg';

const ImportWatchAddress = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const wallet = useWallet();
  const [form] = Form.useForm();
  const [walletconnectModalVisible, setWalletconnectModalVisible] = useState(
    false
  );
  const connector = useRef<WalletConnect>();
  const [walletconnectUri, setWalletconnectUri] = useState('');

  const [run, loading] = useWalletRequest(wallet.importWatchAddress, {
    onSuccess(accounts) {
      history.replace({
        pathname: '/import/success',
        state: {
          accounts,
          title: t('Successfully created'),
        },
      });
    },
    onError(err) {
      form.setFields([
        {
          name: 'address',
          errors: [err?.message || t('Not a valid address')],
        },
      ]);
    },
  });

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

  return (
    <StrayPageWithButton
      onSubmit={({ address }) => run(address)}
      spinning={loading}
      form={form}
      hasBack
      hasDivider
      noPadding
      className="import-watchmode"
    >
      <header className="create-new-header create-password-header h-[264px]">
        <img
          className="rabby-logo"
          src="/images/logo-gray.png"
          alt="rabby logo"
        />
        <img
          className="unlock-logo w-[128px] h-[128px] mx-auto"
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
      <Form.Item
        className="pt-32 px-20"
        name="address"
        rules={[{ required: true, message: t('Please input address') }]}
      >
        <Input
          placeholder={t('Address')}
          size="large"
          maxLength={44}
          autoFocus
          spellCheck={false}
        />
      </Form.Item>
      <div className="flex justify-between px-20">
        <div
          className="w-[172px] import-watchmode__button"
          onClick={handleImportByWalletconnect}
        >
          <img src={IconWalletconnect} className="icon icon-walletconnect" />
          {t('Scan via mobile wallet')}
        </div>
        <div className="w-[172px] import-watchmode__button">
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
        <p className="guide">
          {t('Scan QR codes with WalletConnect-compatible wallets')}
        </p>
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
    </StrayPageWithButton>
  );
};

export default ImportWatchAddress;
