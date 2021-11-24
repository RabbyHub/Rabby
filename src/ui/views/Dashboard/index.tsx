import React, { useEffect, useState } from 'react';
import ClipboardJS from 'clipboard';
import QRCode from 'qrcode.react';
import { useHistory } from 'react-router-dom';
import { useInterval } from 'react-use';
import { message, Popover, Input, Button } from 'antd';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { SORT_WEIGHT, BRAND_ALIAN_TYPE_TEXT } from 'consts';
import { AddressViewer, Modal } from 'ui/component';
import { useWallet, getAccountIcon } from 'ui/utils';
import { Account } from 'background/service/preference';
import {
  RecentConnections,
  BalanceView,
  useConfirmExternalModal,
  SwitchAddress,
  DefaultWalletAlertBar,
} from './components';
import IconSetting from 'ui/assets/settings.svg';
import IconSend from 'ui/assets/send.svg';
import IconHistory from 'ui/assets/history.svg';
import IconPending from 'ui/assets/pending.svg';
import IconSuccess from 'ui/assets/success.svg';
import IconUpAndDown from 'ui/assets/up-and-down.svg';
import { ReactComponent as IconCopy } from 'ui/assets/urlcopy.svg';
import IconEditPen from 'ui/assets/editpen.svg';

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
  const [hovered, setHovered] = useState(false);
  const [clicked, setClicked] = useState(false);
  const [startEdit, setStartEdit] = useState(false);
  const [alianName, setAlianName] = useState<string>('');
  const [accountsList, setAccountsList] = useState<Account[]>([]);
  const [hoverItem, setHoverItem] = useState(-1);
  const handleToggle = () => {
    setModalOpen(!isModalOpen);
  };

  const getCurrentAccount = async () => {
    const account = await wallet.getCurrentAccount();
    if (!account) {
      history.replace('/no-address');
      return;
    }
    account.displayBrandName = BRAND_ALIAN_TYPE_TEXT[account.brandName];
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
  const getAlianName = async (address: string) => {
    await wallet.getAlianName(address).then((name) => {
      setAlianName(name);
    });
  };
  useInterval(() => {
    if (!currentAccount) return;
    getPendingTxCount(currentAccount.address);
  }, 30000);

  useEffect(() => {
    if (!currentAccount) {
      getCurrentAccount();
    }
    checkIsDefaultWallet();
    getAllKeyrings();
  }, []);

  useEffect(() => {
    if (currentAccount) {
      getPendingTxCount(currentAccount.address);
      getAlianName(currentAccount?.address);
      currentAccount.displayBrandName =
        BRAND_ALIAN_TYPE_TEXT[currentAccount.brandName];
      // const sameAddress = accountsList
      //   .filter((item) => item.address === currentAccount.address)
      //   .map((account) => {
      //     return {
      //       ...account,
      //       displayBrandName: currentAccount.displayBrandName,
      //     };
      //   });
      setCurrentAccount(currentAccount);
      //setAccountsList([...accountsList, ...sameAddress])
    }
  }, [currentAccount]);

  const handleConfig = () => {
    history.push('/settings');
  };

  const handleChange = async (account) => {
    const { address, type, brandName } = account;
    await wallet.changeAccount({ address, type, brandName });
    setCurrentAccount({ address, type, brandName });
    hide();
  };

  const handleGotoSend = async () => {
    history.push('/send-token');
  };

  const handleGotoHistory = async () => {
    history.push('/tx-history');
  };

  const handleCopyCurrentAddress = () => {
    const clipboard = new ClipboardJS('.address-popover', {
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

  const handleAlianNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAlianName(e.target.value);
  };
  const alianNameConfirm = async () => {
    await wallet.updateAlianName(currentAccount?.address, alianName);
    await getAllKeyrings();
    handleHoverChange(false);
  };
  const hoverContent = () => (
    <div className="flex flex-col">
      <div className="flex items-center">
        {currentAccount && (
          <img
            className="icon icon-account-type w-[20px] h-[20px]"
            src={getAccountIcon(currentAccount)}
          />
        )}
        <div className="brand-name">
          {startEdit ? (
            <Input
              value={alianName}
              defaultValue={alianName}
              onChange={handleAlianNameChange}
              onPressEnter={alianNameConfirm}
              autoFocus={startEdit}
              bordered={false}
              maxLength={20}
              min={0}
            />
          ) : (
            alianName || currentAccount?.displayBrandName
          )}
        </div>
        <img
          className="edit-name"
          src={IconEditPen}
          onClick={() => setStartEdit(true)}
        />
      </div>
      <div className="flex text-12 mt-12">
        <div className="mr-8">{currentAccount?.address}</div>
        <IconCopy
          className={clsx('icon icon-copy ml-7', { success: copySuccess })}
          onClick={handleCopyCurrentAddress}
        />
      </div>
      <div className="qrcode-container">
        <QRCode value={currentAccount?.address} size={85} />
      </div>
    </div>
  );
  const clickContent = () => (
    <div className="flex flex-col w-[200px]">
      {accountsList.length < 2 ? (
        <div> no other address</div>
      ) : (
        accountsList
          .filter(
            (account) =>
              account.address !== currentAccount?.address ||
              account.brandName !== currentAccount?.brandName
          )
          .map((item, key) => (
            <div
              className="flex items-center address-item"
              key={key}
              onMouseEnter={() => setHoverItem(key)}
              onMouseLeave={() => setHoverItem(-1)}
              onClick={() => handleChange(item)}
            >
              {' '}
              <img
                className="icon icon-account-type w-[15px] h-[15px]"
                src={getAccountIcon(item)}
              />
              <div className="flex flex-col items-start ml-10">
                <div className="text-13 text-black text-left">
                  {item?.alianName || item.displayBrandName || item.brandName}
                  <AddressViewer
                    address={item.address}
                    showArrow={false}
                    className={'text-12 text-black opacity-60'}
                  />
                </div>
              </div>
            </div>
          ))
      )}
    </div>
  );
  const getAllKeyrings = async () => {
    const _accounts = await wallet.getAllVisibleAccounts();
    const allAlianNames = await wallet.getAllAlianName();
    const templist = _accounts
      .sort((a, b) => {
        return SORT_WEIGHT[a.type] - SORT_WEIGHT[b.type];
      })
      .map((item) =>
        item.accounts.map((account) => {
          return {
            ...account,
            displayBrandName:
              BRAND_ALIAN_TYPE_TEXT[account.brandName] || account.brandName,
            type: item.type,
            alianName: allAlianNames[account.address],
            keyring: item.keyring,
          };
        })
      )
      .flat(1);
    setAccountsList(templist);
  };
  const handleHoverChange = (visible) => {
    setHovered(visible);
    setClicked(false);
  };
  const handleClickChange = (visible) => {
    setClicked(visible);
    setHovered(false);
  };
  const hide = () => {
    setClicked(false);
    setHovered(false);
  };
  console.log(
    accountsList.filter(
      (account) =>
        account.address !== currentAccount?.address ||
        account.brandName !== currentAccount?.brandName
    ),
    93333
  );
  return (
    <>
      <div
        className={clsx('dashboard', { 'metamask-active': !isDefaultWallet })}
      >
        <div className="main">
          {currentAccount && (
            <div className="flex header items-center">
              <div className="h-[32px] flex header-wrapper items-center relative">
                <Popover
                  style={{ width: 500 }}
                  content={hoverContent}
                  trigger="hover"
                  visible={hovered}
                  placement="bottomLeft"
                  overlayClassName="address-popover"
                  onVisibleChange={handleHoverChange}
                >
                  <Popover
                    style={{ width: 200 }}
                    content={clickContent}
                    trigger="click"
                    visible={clicked}
                    placement="bottomLeft"
                    overlayClassName="switch-popover"
                    onVisibleChange={handleClickChange}
                  >
                    {
                      <img
                        className="icon icon-account-type w-[20px] h-[20px]"
                        src={getAccountIcon(currentAccount)}
                      />
                    }
                    <div className="text-15 text-white ml-6 mr-6">
                      {alianName ||
                        currentAccount.displayBrandName ||
                        currentAccount.brandName}
                    </div>
                    {currentAccount && (
                      <AddressViewer
                        address={currentAccount.address}
                        showArrow={false}
                        className={'text-12 text-white opacity-60'}
                      />
                    )}
                    <img
                      className="icon icon-account-type w-[16px] h-[16px] ml-8"
                      src={IconUpAndDown}
                    />
                  </Popover>
                </Popover>
              </div>
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
