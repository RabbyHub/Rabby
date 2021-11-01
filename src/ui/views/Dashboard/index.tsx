import React, { useEffect, useState } from 'react';
import ClipboardJS from 'clipboard';
import QRCode from 'qrcode.react';
import { useHistory } from 'react-router-dom';
import { useInterval } from 'react-use';
import { message } from 'antd';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { WALLET_BRAND_CONTENT, KEYRINGS_LOGOS } from 'consts';
import { AddressViewer, Modal } from 'ui/component';
import { useWallet } from 'ui/utils';
import { Account } from 'background/service/preference';
import {
  RecentConnections,
  BalanceView,
  useConfirmExternalModal,
  SwitchAddress,
  DefaultWalletAlertBar,
} from './components';
import IconSetting from 'ui/assets/settings.svg';
import { ReactComponent as IconCopy } from 'ui/assets/copy.svg';
import { ReactComponent as IconQrcode } from 'ui/assets/qrcode.svg';
import IconSend from 'ui/assets/send.svg';
import IconHistory from 'ui/assets/history.svg';
import IconPending from 'ui/assets/pending.svg';
import IconSuccess from 'ui/assets/success.svg';
import './style.less';

const Dashboard = () => {
  const history = useHistory();
  const wallet = useWallet();
  const { t } = useTranslation();
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const [isModalOpen, setModalOpen] = useState(false);
  const [qrcodeVisible, setQrcodeVisible] = useState(false);
  const [pendingTxCount, setPendingTxCount] = useState(0);
  const [isDefaultWallet, setIsDefaultWallet] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);

  const handleToggle = () => {
    setModalOpen(!isModalOpen);
  };

  const getCurrentAccount = async () => {
    const account = await wallet.getCurrentAccount();
    if (!account) {
      history.replace('/no-address');
      return;
    }
    setCurrentAccount(account);
  };

  const getPendingTxCount = async (address: string) => {
    const count = await wallet.getPendingCount(address);
    setPendingTxCount(count);
  };

  const checkIsDefaultWallet = async () => {
    const isDefault = await wallet.isDefaultWallet();
    setIsDefaultWallet(isDefault);
  };

  const _openInTab = useConfirmExternalModal();

  useInterval(() => {
    if (!currentAccount) return;
    getPendingTxCount(currentAccount.address);
  }, 30000);

  useEffect(() => {
    if (!currentAccount) {
      getCurrentAccount();
    }
    checkIsDefaultWallet();
  }, []);

  useEffect(() => {
    if (currentAccount) {
      getPendingTxCount(currentAccount.address);
    }
  }, [currentAccount]);

  const handleConfig = () => {
    history.push('/settings');
  };

  const handleChange = async (
    account: string,
    type: string,
    brandName: string
  ) => {
    await wallet.changeAccount({ address: account, type, brandName });
    setCurrentAccount({ address: account, type, brandName });
    handleToggle();
  };

  const handleGotoSend = async () => {
    history.push('/send-token');
  };

  const handleGotoHistory = async () => {
    history.push('/tx-history');
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

  const handleDefaultWalletChange = async () => {
    const isDefault = await wallet.isDefaultWallet();
    setIsDefaultWallet(isDefault);
  };

  const handleShowQrcode = () => {
    setQrcodeVisible(true);
  };
  return (
    <>
      <div
        className={clsx('dashboard', { 'metamask-active': !isDefaultWallet })}
      >
        <div className="main">
          {currentAccount && (
            <div className="flex header items-center">
              {KEYRINGS_LOGOS[currentAccount?.type] ? (
                <img
                  className="icon icon-account-type"
                  src={KEYRINGS_LOGOS[currentAccount?.type]}
                />
              ) : (
                <img
                  className="icon icon-account-type"
                  src={WALLET_BRAND_CONTENT[currentAccount?.brandName]?.image}
                />
              )}
              {currentAccount && (
                <AddressViewer
                  address={currentAccount.address}
                  onClick={handleToggle}
                />
              )}
              <IconCopy
                className={clsx('icon icon-copy', { success: copySuccess })}
                onClick={handleCopyCurrentAddress}
              />
              <IconQrcode
                className="icon icon-qrcode"
                onClick={handleShowQrcode}
              />
              <div className="flex-1" />
              <img
                className="icon icon-settings"
                src={IconSetting}
                onClick={handleConfig}
              />
            </div>
          )}
          <BalanceView currentAccount={currentAccount} />
          <div className="operation">
            <div className="operation-item" onClick={handleGotoSend}>
              <img className="icon icon-send" src={IconSend} />
              {t('Send')}
            </div>
            <div className="operation-item" onClick={handleGotoHistory}>
              {pendingTxCount > 0 ? (
                <div className="pending-count">
                  <img src={IconPending} className="icon icon-pending" />
                  {pendingTxCount}
                </div>
              ) : (
                <img className="icon icon-history" src={IconHistory} />
              )}
              {t('History')}
            </div>
          </div>
        </div>
        <RecentConnections />
        {!isDefaultWallet && (
          <DefaultWalletAlertBar onChange={handleDefaultWalletChange} />
        )}
      </div>
      <Modal
        visible={qrcodeVisible}
        closable={false}
        onCancel={() => setQrcodeVisible(false)}
        className="qrcode-modal"
        width="304px"
      >
        <div>
          <QRCode value={currentAccount?.address} size={254} />
          <p className="address text-gray-subTitle text-15 font-medium mb-0 font-roboto-mono">
            {currentAccount?.address}
          </p>
        </div>
      </Modal>
      {currentAccount && (
        <SwitchAddress
          currentAccount={currentAccount}
          onChange={handleChange}
          visible={isModalOpen}
          onCancel={handleToggle}
        />
      )}
    </>
  );
};

export default Dashboard;
