import React from 'react';
import ClipboardJS from 'clipboard';
import QRCode from 'qrcode.react';
import { browser } from 'webextension-polyfill-ts';
import { useEffect, useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { message, Modal } from 'antd';
import { CHAINS } from 'consts';
import { AddressViewer, AddressList } from 'ui/component';
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
import IconSuccess from 'ui/assets/success.svg';
import IconChecked from 'ui/assets/checked.svg';
import IconNotChecked from 'ui/assets/not-checked.svg';
import IconAdd from 'ui/assets/add.svg';
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
        <Link to="/add-address">
          <img src={IconAdd} className="icon icon-add" />
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

  const getPendingTxCount = async () => {
    if (!currentAccount) return;
    const { total_count } = await wallet.openapi.getPendingCount(
      currentAccount.address
    );
    setPendingTxCount(total_count);
  };

  useEffect(() => {
    getPendingTxCount();
  }, [currentAccount]);

  useEffect(() => {
    getCurrentAccount();
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

  return (
    <>
      <div className="dashboard">
        <div className="main">
          <div className="flex header items-center">
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
          <div className="operation flex">
            <div className="operation-item" onClick={handleGotoSend}>
              <img className="icon icon-send" src={IconSend} />
              Send
            </div>
            <div className="operation-item" onClick={handleGotoSwap}>
              <img className="icon icon-swap" src={IconSwap} />
              Swap
            </div>
            <div className="operation-item" onClick={handleGotoHistory}>
              <img className="icon icon-history" src={IconHistory} />
              History
              {pendingTxCount > 0 && (
                <p className="pending-count mb-0 text-12 text-white text-opacity-60">
                  {pendingTxCount} pending
                </p>
              )}
            </div>
          </div>
        </div>
        <RecentConnections />
      </div>
      <Modal
        centered
        visible={qrcodeVisible}
        footer={null}
        closable={false}
        onCancel={() => setQrcodeVisible(false)}
        className="qrcode-modal"
        width="64%"
      >
        <div>
          <QRCode value={currentAccount?.address} size={212} />
          <p className="address text-gray-subTitle text-13 font-medium mb-0">
            {currentAccount?.address}
          </p>
        </div>
      </Modal>
      <Modal
        centered
        title="Set Current Address"
        visible={isModalOpen}
        footer={null}
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
