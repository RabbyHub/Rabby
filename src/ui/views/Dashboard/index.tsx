import React, { useEffect, useState } from 'react';
import ClipboardJS from 'clipboard';
import QRCode from 'qrcode.react';
import { useHistory } from 'react-router-dom';
import { useInterval } from 'react-use';
import { message } from 'antd';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { CHAINS, HARDWARE_KEYRING_TYPES, KEYRING_TYPE } from 'consts';
import { AddressViewer, Modal } from 'ui/component';
import { useWallet, getCurrentConnectSite } from 'ui/utils';
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
import IconSwap from 'ui/assets/swap.svg';
import IconHistory from 'ui/assets/history.svg';
import IconPending from 'ui/assets/pending.svg';
import IconSuccess from 'ui/assets/success.svg';
import IconHardware from 'ui/assets/hardware-white.svg';
import IconWatch from 'ui/assets/watch-white.svg';
import IconExternal from 'ui/assets/open-external-gray.svg';
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

  const handleChange = async (account: string, type: string) => {
    await wallet.changeAccount({ address: account, type });
    setCurrentAccount({ address: account, type });
    handleToggle();
  };

  const handleGotoSend = async () => {
    history.push('/send-token');
    // const site = await getCurrentConnectSite(wallet);
    // let chain: null | string = null;
    // if (site) {
    //   chain = CHAINS[site.chain].serverId;
    // }
    // _openInTab(`https://debank.com/send${chain ? `?chain=${chain}` : ''}`);
  };

  const handleGotoHistory = async () => {
    history.push('/tx-history');
  };

  const handleGotoSwap = async () => {
    const site = await getCurrentConnectSite(wallet);
    let chain: null | string = null;
    if (site) {
      chain = CHAINS[site.chain].serverId;
    }
    _openInTab(`https://debank.com/swap${chain ? `?chain=${chain}` : ''}`);
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

  const hardwareTypes = Object.values(HARDWARE_KEYRING_TYPES).map(
    (item) => item.type
  );

  return (
    <>
      <div
        className={clsx('dashboard', { 'metamask-active': !isDefaultWallet })}
      >
        <div className="main">
          {currentAccount && (
            <div className="flex header items-center">
              {(currentAccount?.type === KEYRING_TYPE.WatchAddressKeyring ||
                hardwareTypes.includes(currentAccount.type)) && (
                <img
                  src={
                    currentAccount?.type === KEYRING_TYPE.WatchAddressKeyring
                      ? IconWatch
                      : IconHardware
                  }
                  className="icon icon-account-type"
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
            {/* <div className="operation-item" onClick={handleGotoSwap}>
              <div className="operation-item__inner">
                <img className="icon icon-swap" src={IconSwap} />
                {t('Swap')}
                <img src={IconExternal} className="icon icon-external-link" />
              </div>
            </div> */}
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
