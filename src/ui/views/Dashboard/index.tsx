import React from 'react';
import ClipboardJS from 'clipboard';
import QRCode from 'qrcode.react';
import { useEffect, useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { message, Modal } from 'antd';
import { AddressViewer, AddressList } from 'ui/component';
import { useWallet, getCurrentTab } from 'ui/utils';
import { splitNumberByStep } from 'ui/utils/number';
import { DisplayedKeryring } from 'background/service/keyring';
import { Account } from 'background/service/preference';
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
        <Link to="/add-address">Add addresses</Link>
      </div>
    </div>
  ) : null;
};

const Dashboard = () => {
  const history = useHistory();
  const wallet = useWallet();
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);

  const [isModalOpen, setModalOpen] = useState(false);
  const [qrcodeVisible, setQrcodeVisible] = useState(false);

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

  const handleChange = async (account: string, type: string) => {
    const { id: tabId } = await getCurrentTab();
    await wallet.changeAccount({ address: account, type }, tabId);
    setCurrentAccount({ address: account, type });
    handleToggle();
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
          <div className="assets flex">
            <div className="left">
              <p className="amount leading-none">
                ${splitNumberByStep(36425421.18)}
              </p>
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
        title="Switch address"
        visible={isModalOpen}
        footer={null}
        width="344px"
        onCancel={handleToggle}
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
