import React from 'react';
import ClipboardJS from 'clipboard';
import QRCode from 'qrcode.react';
import { browser } from 'webextension-polyfill-ts';
import { useEffect, useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { message } from 'antd';
import { CHAINS, HARDWARE_KEYRING_TYPES, KEYRING_TYPE } from 'consts';
import { AddressViewer, AddressList, Modal } from 'ui/component';
import { useWallet, getCurrentConnectSite } from 'ui/utils';
import { DisplayedKeryring } from 'background/service/keyring';
import { Account } from 'background/service/preference';
import { RecentConnections, BalanceView } from './components';
import IconSetting from 'ui/assets/settings.svg';
import IconCopy from 'ui/assets/copy.svg';
import IconQrcode from 'ui/assets/qrcode.svg';
import IconSend from 'ui/assets/send.svg';
import IconSwap from 'ui/assets/swap.svg';
import IconHistory from 'ui/assets/history.svg';
import IconPending from 'ui/assets/pending.svg';
import IconSuccess from 'ui/assets/success.svg';
import IconChecked from 'ui/assets/checked.svg';
import IconNotChecked from 'ui/assets/not-checked.svg';
import IconManageAddress from 'ui/assets/manage-address.svg';
import IconHardware from 'ui/assets/hardware-white.svg';
import IconWatch from 'ui/assets/watch-white.svg';
import './style.less';

const SwitchAddress = ({
  onChange,
  currentAccount,
}: {
  onChange(account: string, type: string): void;
  currentAccount: Account;
}) => {
  const wallet = useWallet();
  const [accounts, setAccounts] = useState<Record<string, DisplayedKeryring[]>>(
    {}
  );

  const getAllKeyrings = async () => {
    const _accounts = await wallet.getAllVisibleAccounts();
    setAccounts(_accounts);
  };

  const changeAccount = (account: string, keyring: any) => {
    onChange && onChange(account, keyring.type);
  };

  useEffect(() => {
    getAllKeyrings();
  }, []);

  const SwitchButton = ({ data, keyring }: { data: string; keyring: any }) => {
    return (
      <img
        src={
          currentAccount.address === data &&
          currentAccount.type === keyring.type
            ? IconChecked
            : IconNotChecked
        }
        className="icon icon-checked"
      />
    );
  };

  return accounts ? (
    <div className="modal-switch-address">
      <AddressList
        list={accounts}
        ActionButton={SwitchButton}
        onClick={changeAccount}
      />
      <div className="footer">
        <Link to="/settings/address">
          <img src={IconManageAddress} className="icon icon-add" />
          Manage addresses
        </Link>
      </div>
    </div>
  ) : null;
};

const Dashboard = () => {
  const history = useHistory();
  const wallet = useWallet();
  const [currentAccount, setCurrentAccount] = useState<Account | null>(
    wallet.syncGetCurrentAccount()
  );

  const [isModalOpen, setModalOpen] = useState(false);
  const [qrcodeVisible, setQrcodeVisible] = useState(false);
  const [pendingTxCount, setPendingTxCount] = useState(0);

  const handleToggle = () => {
    setModalOpen(!isModalOpen);
  };

  const getCurrentAccount = async () => {
    const account = await wallet.getCurrentAccount();
    setCurrentAccount(account);
  };

  const getPendingTxCount = async (address: string) => {
    const { total_count } = await wallet.openapi.getPendingCount(address);
    setPendingTxCount(total_count);
  };

  useEffect(() => {
    if (!currentAccount) return;
    getPendingTxCount(currentAccount.address);
  }, [currentAccount]);

  useEffect(() => {
    getCurrentAccount();

    const intervalId = setInterval(() => {
      if (!currentAccount) return;
      getPendingTxCount(currentAccount.address);
    }, 30000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const handleConfig = () => {
    history.push('/settings');
  };

  const handleChange = async (account: string, type: string) => {
    await wallet.changeAccount({ address: account, type });
    setCurrentAccount({ address: account, type });
    handleToggle();
  };

  const handleGotoSend = () => {
    browser.tabs.create({
      url: 'https://debank.com/send',
    });
  };

  const handleGotoHistory = () => {
    browser.tabs.create({
      url: `https://debank.com/profile/${currentAccount?.address}/history`,
    });
  };

  const handleGotoSwap = async () => {
    const site = await getCurrentConnectSite(wallet);
    let chain: null | string = null;
    if (site) {
      chain = CHAINS[site.chain].serverId;
    }
    browser.tabs.create({
      url: `https://debank.com/swap${chain ? `?chain=${chain}` : ''}`,
    });
  };

  const handleCopyCurrentAddress = () => {
    const clipboard = new ClipboardJS('.main', {
      text: function () {
        return currentAccount!.address;
      },
    });

    clipboard.on('success', () => {
      message.success({
        icon: <img src={IconSuccess} className="icon icon-success" />,
        content: 'Copied',
        duration: 0.5,
      });
      clipboard.destroy();
    });
  };

  const handleShowQrcode = () => {
    setQrcodeVisible(true);
  };

  const hardwareTypes = Object.values(HARDWARE_KEYRING_TYPES).map(
    (item) => item.type
  );

  return (
    <>
      <div className="dashboard">
        <div className="main">
          <div className="flex header items-center">
            {(currentAccount?.type === KEYRING_TYPE.WatchAddressKeyring ||
              hardwareTypes.includes(currentAccount!.type)) && (
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
            <img
              className="icon icon-copy"
              src={IconCopy}
              onClick={handleCopyCurrentAddress}
            />
            <img
              className="icon icon-qrcode"
              src={IconQrcode}
              onClick={handleShowQrcode}
            />
            <div className="flex-1" />
            <img
              className="icon icon-settings"
              src={IconSetting}
              onClick={handleConfig}
            />
          </div>
          <BalanceView currentAccount={currentAccount} />
          <div className="operation">
            <div className="operation-item" onClick={handleGotoSend}>
              <img className="icon icon-send" src={IconSend} />
              Send
            </div>
            <div className="operation-item" onClick={handleGotoSwap}>
              <img className="icon icon-swap" src={IconSwap} />
              Swap
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
              History
            </div>
          </div>
        </div>
        <RecentConnections />
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
      <Modal
        title="Set Current Address"
        visible={isModalOpen}
        width="344px"
        onCancel={handleToggle}
        style={{ margin: 0, padding: 0 }}
      >
        {currentAccount && (
          <SwitchAddress
            currentAccount={currentAccount}
            onChange={handleChange}
          />
        )}
      </Modal>
    </>
  );
};

export default Dashboard;
