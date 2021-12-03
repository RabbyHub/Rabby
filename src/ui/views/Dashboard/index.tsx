import React, { useEffect, useState, useRef } from 'react';
import ClipboardJS from 'clipboard';
import QRCode from 'qrcode.react';
import { useHistory, Link } from 'react-router-dom';
import { useInterval } from 'react-use';
import { message, Popover, Input, Tooltip } from 'antd';
import { FixedSizeList } from 'react-window';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  SORT_WEIGHT,
  KEYRING_ICONS,
  WALLET_BRAND_CONTENT,
  KEYRING_ICONS_WHITE,
} from 'consts';
import { AddressViewer, Modal } from 'ui/component';
import { useWallet } from 'ui/utils';
import { Account } from 'background/service/preference';
import {
  RecentConnections,
  BalanceView,
  DefaultWalletAlertBar,
} from './components';
import { getUpdateContent } from 'changeLogs/index';
import IconSetting from 'ui/assets/settings.svg';
import IconSend from 'ui/assets/send.svg';
import IconHistory from 'ui/assets/history.svg';
import IconPending from 'ui/assets/pending.svg';
import IconSuccess from 'ui/assets/success.svg';
import IconUpAndDown from 'ui/assets/up-and-down.svg';
import { ReactComponent as IconCopy } from 'ui/assets/urlcopy.svg';
import IconEditPen from 'ui/assets/editpen.svg';
import IconCorrect from 'ui/assets/correct.svg';
import IconPlus from 'ui/assets/dashboard-plus.svg';
import IconInfo from 'ui/assets/information.png';
import IconProfile from 'ui/assets/profile.svg';
import './style.less';
const Dashboard = () => {
  const history = useHistory();
  const wallet = useWallet();
  const { t } = useTranslation();
  const fixedList = useRef<FixedSizeList>();

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
  const [displayName, setDisplayName] = useState<string>('');
  const [accountsList, setAccountsList] = useState<Account[]>([]);
  const [firstNotice, setFirstNotice] = useState(false);
  const [updateContent, setUpdateContent] = useState('');
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
  const getAlianName = async (address: string) => {
    await wallet.getAlianName(address).then((name) => {
      setAlianName(name);
      setDisplayName(name);
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
  }, []);

  useEffect(() => {
    if (currentAccount) {
      getPendingTxCount(currentAccount.address);
      getAlianName(currentAccount?.address.toLowerCase());
      setCurrentAccount(currentAccount);
      getAllKeyrings();
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
    history.push({
      pathname: '/send-token',
      state: {
        accountsList,
      },
    });
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
    e.stopPropagation();
    setAlianName(e.target.value);
  };
  const alianNameConfirm = async (e) => {
    e.stopPropagation();
    if (!alianName) {
      return;
    }
    setStartEdit(false);
    await wallet.updateAlianName(
      currentAccount?.address?.toLowerCase(),
      alianName
    );
    setDisplayName(alianName);
    const newAccountList = accountsList.map((item) => {
      if (
        item.address.toLowerCase() === currentAccount?.address.toLowerCase()
      ) {
        return {
          ...item,
          alianName: alianName,
        };
      }
      return item;
    });
    if (newAccountList.length > 0) {
      setAccountsList(newAccountList);
    }
    hide();
  };
  const checkIfFirstLogin = async () => {
    const firstOpen = await wallet.getIsFirstOpen();
    const updateContent = await getUpdateContent();
    setUpdateContent(updateContent);
    if (!firstOpen || !updateContent) return;
    setFirstNotice(firstOpen);
  };
  const changeIsFirstLogin = () => {
    wallet.updateIsFirstOpen();
    setFirstNotice(false);
  };
  useEffect(() => {
    checkIfFirstLogin();
  }, []);
  const hoverContent = () => (
    <div className="flex flex-col" onClick={() => setStartEdit(false)}>
      <div className="flex items-center">
        {currentAccount && (
          <img
            className="icon icon-account-type w-[32px] h-[32px]"
            src={
              KEYRING_ICONS[currentAccount.type] ||
              WALLET_BRAND_CONTENT[currentAccount.brandName]?.image
            }
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
              onClick={(e) => e.stopPropagation()}
              maxLength={20}
              min={0}
            />
          ) : (
            <div
              onClick={(e) => {
                e.stopPropagation();
                setStartEdit(true);
              }}
            >
              {displayName}
            </div>
          )}
        </div>
        {!startEdit && (
          <img
            className="edit-name"
            src={IconEditPen}
            onClick={(e) => {
              e.stopPropagation();
              setStartEdit(true);
            }}
          />
        )}
        {startEdit && (
          <img
            className="edit-name w-[16px] h-[16px]"
            src={IconCorrect}
            onClick={(e) => {
              e.stopPropagation();
              alianNameConfirm(e);
            }}
          />
        )}
      </div>
      <div className="flex text-12 mt-12" onClick={handleCopyCurrentAddress}>
        <div className="mr-8 pt-2 lh-14">{currentAccount?.address}</div>
        <IconCopy
          className={clsx('icon icon-copy ml-7 mb-2 copy-icon', {
            success: copySuccess,
          })}
        />
      </div>
      <div className="qrcode-container">
        <QRCode value={currentAccount?.address} size={85} />
      </div>
    </div>
  );
  const Row = (props) => {
    const { data, index, style } = props;
    const account = data[index];
    return (
      <div
        className="flex items-center address-item"
        key={index}
        style={style}
        onClick={() => handleChange(account)}
      >
        {' '}
        <img
          className="icon icon-account-type w-[20px] h-[20px]"
          src={
            KEYRING_ICONS[account.type] ||
            WALLET_BRAND_CONTENT[account.brandName]?.image
          }
        />
        <div className="flex flex-col items-start ml-10">
          <div className="text-13 text-black text-left click-name">
            <div className="list-alian-name">{account?.alianName}</div>
            <AddressViewer
              address={account?.address}
              showArrow={false}
              className={'text-12 text-black opacity-60'}
            />
          </div>
        </div>
      </div>
    );
  };
  const clickContent = () => (
    <div className="flex flex-col w-[200px]">
      {accountsList.length < 1 ? (
        <div className="no-other-address"> {t('No other address')}</div>
      ) : (
        <FixedSizeList
          height={accountsList.length > 5 ? 308 : accountsList.length * 52}
          width="100%"
          itemData={accountsList}
          itemCount={accountsList.length}
          itemSize={52}
          ref={fixedList}
        >
          {Row}
        </FixedSizeList>
      )}
      <Link to="/add-address" className="pop-add-address flex items-center">
        {' '}
        <img src={IconPlus} />
        <p className="mb-0 ml-15 lh-1">{t('Add addresses')}</p>
      </Link>
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
            type: item.type,
            alianName: allAlianNames[account?.address?.toLowerCase()],
            keyring: item.keyring,
          };
        })
      )
      .flat(1)
      .filter(
        (item) =>
          item?.address.toLowerCase() !==
            currentAccount?.address.toLowerCase() ||
          item.brandName !== currentAccount?.brandName
      );
    setAccountsList(templist);
  };
  const handleHoverChange = (visible) => {
    setHovered(visible);
    setClicked(false);
  };
  const handleClickChange = (visible) => {
    setClicked(visible);
    setStartEdit(false);
    setHovered(false);
  };
  const hide = () => {
    setStartEdit(false);
    setClicked(false);
    setHovered(false);
  };
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
                      src={
                        KEYRING_ICONS_WHITE[currentAccount.type] ||
                        WALLET_BRAND_CONTENT[currentAccount.brandName]?.image
                      }
                    />
                  }
                  <div className="text-15 text-white ml-6 mr-6 dashboard-name">
                    {displayName}
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
              </div>
              <Popover
                style={{ width: 500 }}
                content={hoverContent}
                trigger="hover"
                visible={hovered}
                //placement="bottomRight"
                overlayClassName="address-popover"
                onVisibleChange={handleHoverChange}
              >
                <img src={IconInfo} className="w-[16px] h-[16px]" />
              </Popover>
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
            <Tooltip
              overlayClassName="rectangle profileType__tooltip"
              title={t('Coming soon')}
            >
              <div className="operation-item opacity-60">
                <img className="icon icon-send" src={IconProfile} />
                {t('Profile')}
              </div>
            </Tooltip>
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
      <Modal
        visible={firstNotice && updateContent}
        title="What's new"
        className="first-notice"
        onCancel={changeIsFirstLogin}
        maxHeight="420px"
      >
        <ReactMarkdown children={updateContent} remarkPlugins={[remarkGfm]} />
      </Modal>
    </>
  );
};

export default Dashboard;
