import React from 'react';
import ClipboardJS from 'clipboard';
import { useEffect, useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { message } from 'antd';
import { Modal, AddressViewer } from 'ui/component';
import { useWallet, getCurrentTab } from 'ui/utils';
import RecentConnections from './components/RecentConnections';
import IconSetting from 'ui/assets/settings.svg';
import IconCopy from 'ui/assets/copy.svg';
import IconQrcode from 'ui/assets/qrcode.svg';
import IconArrowRight from 'ui/assets/arrow-right.svg';
import IconSend from 'ui/assets/send.svg';
import IconSwap from 'ui/assets/swap.svg';
import IconHistory from 'ui/assets/history.svg';
import './style.less';

const SwitchAddress = ({ onChange }) => {
  const wallet = useWallet();
  const [accounts, setAccounts] = useState<any[]>([]);
  const keyrings = {
    'HD Key Tree': 'Mnemonics addresses',
    'Simple Key Pair': 'Private key addresses',
  };

  const getAllKeyrings = async () => {
    const _accounts = await wallet.getAllTypedAccounts();

    setAccounts(_accounts);
  };

  const handleCreate = async () => {
    await wallet.addNewAccount();
    getAllKeyrings();
  };

  const changeAccount = (account: any) => {
    onChange && onChange(account);
  };

  useEffect(() => {
    getAllKeyrings();
  }, []);

  return accounts ? (
    <div className="bg-white shadow-even p-4">
      <div className="mb-6 overflow-auto w-[280px] h-[220px]">
        {accounts.map((a) => (
          <div key={a.type} className="mb-6">
            <div className="text-gray-500 text-lg">{keyrings[a.type]}</div>
            {a.accounts.map((acct) => (
              <div
                onClick={() => changeAccount(acct)}
                className="bg-gray-100 text-gray-800 p-4 text-xs mt-4"
                key={acct}
              >
                {acct}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div>
        <div className="text-gray-500 text-sm mb-1">New address</div>
        <div className="text-gray-500 text-lg mb-1" onClick={handleCreate}>
          Create a new address
        </div>
        <Link className="block text-gray-500 text-lg" to="/import">
          Import addresses
        </Link>
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
    const account = await wallet.getAccount();
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
      message.success('Copied');
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
      <Modal isOpen={isModalOpen} onClose={handleToggle}>
        <SwitchAddress onChange={handleChange} />
      </Modal>
    </>
  );
};

export default Dashboard;
