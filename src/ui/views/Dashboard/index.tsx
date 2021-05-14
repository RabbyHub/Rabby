import React from 'react';
import ClipboardJS from 'clipboard';
import { useEffect, useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { message, Modal } from 'antd';
import { AddressViewer, AddressList } from 'ui/component';
import { useWallet, getCurrentTab } from 'ui/utils';
import { DisplayedKeryring } from 'background/service/keyring';
import RecentConnections from './components/RecentConnections';
import IconSetting from 'ui/assets/settings.svg';
import IconCopy from 'ui/assets/copy.svg';
import IconQrcode from 'ui/assets/qrcode.svg';
import IconArrowRight from 'ui/assets/arrow-right.svg';
import IconSend from 'ui/assets/send.svg';
import IconSwap from 'ui/assets/swap.svg';
import IconHistory from 'ui/assets/history.svg';
import IconSuccess from 'ui/assets/success.svg';
import IconChecked from 'ui/assets/checked.svg';
import IconNotChecked from 'ui/assets/not-checked.svg';
import './style.less';

const SwitchAddress = ({
  onChange,
  currentAccount,
}: {
  onChange(account: string): void;
  currentAccount: string;
}) => {
  const wallet = useWallet();
  const [accounts, setAccounts] = useState<Record<string, DisplayedKeryring[]>>(
    {}
  );

  const getAllKeyrings = async () => {
    const _accounts = await wallet.getAllClassAccounts();

    setAccounts(_accounts);
  };

  const handleCreate = async () => {
    await wallet.deriveNewAccount();
    getAllKeyrings();
  };

  const changeAccount = (account: string) => {
    onChange && onChange(account);
  };

  useEffect(() => {
    getAllKeyrings();
  }, []);

  const SwitchButton = ({ data }: { data: string }) => {
    return (
      <img
        onClick={() => changeAccount(data)}
        src={currentAccount === data ? IconChecked : IconNotChecked}
        className="icon icon-checked"
      />
    );
  };

  return accounts ? (
    <div className="modal-switch-address">
      <AddressList list={accounts} ActionButton={SwitchButton} />
      <div className="footer">
        <Link to="/add-address">Add addresses</Link>
      </div>
    </div>
  ) : null;
};

const Dashboard = () => {
  const history = useHistory();
  const wallet = useWallet();
  const [currentAccount, setCurrentAccount] = useState('');

  const [isModalOpen, setModalOpen] = useState(false);

  const handleToggle = () => {
    setModalOpen(!isModalOpen);
  };

  const getCurrentAccount = async () => {
    const account = await wallet.getCurrentAccount();
    setCurrentAccount(account);
  };

  useEffect(() => {
    getCurrentAccount();
  }, []);

  const handleConfig = () => {
    history.push('/settings');
  };

  const handleChange = async (account) => {
    const { id: tabId } = await getCurrentTab();
    await wallet.changeAccount(account, tabId);
    setCurrentAccount(account);
    handleToggle();
  };

  const handleCopyCurrentAddress = () => {
    const clipboard = new ClipboardJS('.main', {
      text: function () {
        return currentAccount;
      },
    });

    clipboard.on('success', () => {
      message.success({
        icon: <img src={IconSuccess} className="icon icon-success" />,
        content: 'Copied',
      });
      clipboard.destroy();
    });
  };

  const handleShowQrcode = () => {
    // TODO
  };

  return (
    <>
      <div className="dashboard">
        <div className="main">
          <div className="flex header items-center">
            <AddressViewer address={currentAccount} onClick={handleToggle} />
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
          <div className="assets flex">
            <div className="left">
              <p className="amount leading-none">$3,642,5421.18</p>
              <p className="extra leading-none">
                This seems to be no assets yet
              </p>
            </div>
            <div className="right">
              <img className="icon icon-arrow-right" src={IconArrowRight} />
            </div>
          </div>
          <div className="operation flex">
            <div className="operation-item">
              <img className="icon icon-send" src={IconSend} />
              Send
            </div>
            <div className="operation-item">
              <img className="icon icon-swap" src={IconSwap} />
              Swap
            </div>
            <div className="operation-item">
              <img className="icon icon-history" src={IconHistory} />
              History
            </div>
          </div>
        </div>
        <RecentConnections />
      </div>
      <Modal
        title="Switch address"
        visible={isModalOpen}
        footer={null}
        width="344px"
        onCancel={handleToggle}
      >
        <SwitchAddress
          currentAccount={currentAccount}
          onChange={handleChange}
        />
      </Modal>
    </>
  );
};

export default Dashboard;
