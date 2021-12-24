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
import Safe from '@rabby-wallet/gnosis-sdk';
import { SafeInfo } from '@rabby-wallet/gnosis-sdk/dist/api';
import {
  SORT_WEIGHT,
  KEYRING_ICONS,
  WALLET_BRAND_CONTENT,
  KEYRING_ICONS_WHITE,
  KEYRING_CLASS,
  KEYRING_TYPE,
  CHAINS,
} from 'consts';
import { AddressViewer, Modal } from 'ui/component';
import { useWallet, isSameAddress } from 'ui/utils';
import { Account } from 'background/service/preference';
import { ConnectedSite } from 'background/service/permission';
import {
  RecentConnections,
  BalanceView,
  DefaultWalletAlertBar,
  GnosisWrongChainAlertBar,
} from './components';
import { getUpdateContent } from 'changeLogs/index';
import IconSetting from 'ui/assets/settings.svg';
import IconHistory from 'ui/assets/history.svg';
import IconPending from 'ui/assets/pending.svg';
import IconSuccess from 'ui/assets/success.svg';
import IconUpAndDown from 'ui/assets/up-and-down.svg';
import { ReactComponent as IconCopy } from 'ui/assets/urlcopy.svg';
import IconEditPen from 'ui/assets/editpen.svg';
import IconCorrect from 'ui/assets/correct.svg';
import IconPlus from 'ui/assets/dashboard-plus.svg';
import IconInfo from 'ui/assets/information.png';
import IconMoney from 'ui/assets/dashboardMoney.png';
import IconQueue from 'ui/assets/icon-queue.svg';
import IconTagYou from 'ui/assets/tag-you.svg';
import './style.less';

const GnosisAdminItem = ({
  accounts,
  address,
}: {
  accounts: Account[];
  address: string;
}) => {
  const addressInWallet = accounts.find((account) =>
    isSameAddress(account.address, address)
  );
  return (
    <li>
      <AddressViewer address={address} showArrow={false} />
      {addressInWallet ? (
        <img src={IconTagYou} className="icon icon-tag" />
      ) : (
        <></>
      )}
      <div className="address-type">
        {addressInWallet ? (
          <img
            className="icon icon-account-type"
            src={
              KEYRING_ICONS[addressInWallet.type] ||
              WALLET_BRAND_CONTENT[addressInWallet.brandName].image
            }
          />
        ) : (
          <></>
        )}
      </div>
    </li>
  );
};

const Dashboard = () => {
  const history = useHistory();
  const wallet = useWallet();
  const { t } = useTranslation();
  const fixedList = useRef<FixedSizeList>();

  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const [pendingTxCount, setPendingTxCount] = useState(0);
  const [gnosisPendingCount, setGnosisPendingCount] = useState(0);
  const [safeInfo, setSafeInfo] = useState<SafeInfo | null>(null);
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
  const [isGnosis, setIsGnosis] = useState(false);
  const [gnosisNetworkId, setGnosisNetworkId] = useState('1');
  const [showGnosisWrongChainAlert, setShowGnosisWrongChainAlert] = useState(
    false
  );
  const [currentConnection, setCurrentConnection] = useState<
    ConnectedSite | null | undefined
  >(null);

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

  const getGnosisPendingCount = async () => {
    if (!currentAccount) return;

    const network = await wallet.getGnosisNetworkId(currentAccount.address);
    setGnosisNetworkId(network);
    const info = await Safe.getSafeInfo(currentAccount.address, network);
    const txs = await Safe.getPendingTransactions(
      currentAccount.address,
      network
    );
    setSafeInfo(info);
    setGnosisPendingCount(txs.results.length);
  };

  useInterval(() => {
    if (!currentAccount) return;
    if (currentAccount.type === KEYRING_TYPE.GnosisKeyring) return;
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
      if (currentAccount.type === KEYRING_TYPE.GnosisKeyring) {
        getGnosisPendingCount();
      } else {
        getPendingTxCount(currentAccount.address);
      }
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

  const handleGotoHistory = async () => {
    history.push('/tx-history');
  };

  const handleGotoQueue = () => {
    history.push('/gnosis-queue');
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

  useEffect(() => {
    if (currentAccount) {
      setIsGnosis(currentAccount.type === KEYRING_CLASS.GNOSIS);
    }
  }, [currentAccount]);

  const Row = (props) => {
    const { data, index, style } = props;
    const account = data[index];
    return (
      <div
        className="flex items-center address-item"
        key={index}
        style={style}
        onClick={(e) => {
          e.stopPropagation();
          handleChange(account);
        }}
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
    <>
      <div
        className="click-content-modar"
        onClick={(e) => {
          e.stopPropagation();
          setClicked(false);
        }}
      />
      <div className="click-list flex flex-col w-[200px]">
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
            style={{ zIndex: 10 }}
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
    </>
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

  const handleCurrentConnectChange = (
    connection: ConnectedSite | null | undefined
  ) => {
    setCurrentConnection(connection);
  };

  const checkGnosisConnectChain = () => {
    if (!currentConnection) {
      setShowGnosisWrongChainAlert(false);
      return;
    }
    const chain = CHAINS[currentConnection.chain];
    setShowGnosisWrongChainAlert(chain.id.toString() !== gnosisNetworkId);
  };

  useEffect(() => {
    checkGnosisConnectChain();
  }, [currentConnection, gnosisNetworkId]);

  return (
    <>
      <div
        className={clsx('dashboard', {
          'metamask-active':
            !isDefaultWallet || (showGnosisWrongChainAlert && isGnosis),
        })}
      >
        <div className="main">
          {currentAccount && (
            <div className="flex header items-center">
              <div className="h-[32px] flex header-wrapper items-center relative">
                <Popover
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
              <img
                src={IconInfo}
                onClick={() => setHovered(true)}
                className="w-[16px] h-[16px] pointer"
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
            <Tooltip
              overlayClassName="rectangle profileType__tooltip"
              title={t('Coming soon')}
            >
              <div className="operation-item opacity-60">
                <img className="icon icon-send" src={IconMoney} />
                {t('Portfolio')}
              </div>
            </Tooltip>
            {isGnosis ? (
              <div className="operation-item" onClick={handleGotoQueue}>
                {gnosisPendingCount > 0 && (
                  <span className="operation-item__count">
                    {gnosisPendingCount}
                  </span>
                )}
                <img className="icon icon-queue" src={IconQueue} />
                {t('Queue')}
              </div>
            ) : (
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
            )}
          </div>
        </div>
        <RecentConnections onChange={handleCurrentConnectChange} />
        {!isDefaultWallet && (
          <DefaultWalletAlertBar onChange={handleDefaultWalletChange} />
        )}
        {isDefaultWallet && isGnosis && showGnosisWrongChainAlert && (
          <GnosisWrongChainAlertBar />
        )}
      </div>
      <Modal
        visible={firstNotice && updateContent}
        title="What's new"
        className="first-notice"
        onCancel={changeIsFirstLogin}
        maxHeight="420px"
      >
        <ReactMarkdown children={updateContent} remarkPlugins={[remarkGfm]} />
      </Modal>
      <Modal
        visible={hovered}
        closable={false}
        onCancel={() => setHovered(false)}
        className="address-popover"
        width="344px"
      >
        <div className="flex flex-col" onClick={() => setStartEdit(false)}>
          <div className="address-popover__info">
            <div className="flex items-center h-[32px]">
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
                    style={{ zIndex: 10 }}
                  />
                ) : (
                  displayName
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
            <div className="flex text-12 mt-12">
              <div className="mr-8 pt-2 lh-14">{currentAccount?.address}</div>
              <IconCopy
                onClick={handleCopyCurrentAddress}
                className={clsx('icon icon-copy ml-7 mb-2 copy-icon', {
                  success: copySuccess,
                })}
              />
            </div>
            <div className="qrcode-container">
              <QRCode value={currentAccount?.address} size={85} />
            </div>
          </div>
          {isGnosis && safeInfo && (
            <div className="address-popover__gnosis">
              <h4 className="text-15 mb-4">Admins</h4>
              <p className="text-black text-12 mb-20">
                Any transaction requires the confirmation of{' '}
                <span className="ml-8 font-medium">
                  {safeInfo.threshold}/{safeInfo.owners.length}
                </span>
              </p>
              <ul className="admin-list">
                {safeInfo.owners.map((owner) => (
                  <GnosisAdminItem address={owner} accounts={accountsList} />
                ))}
              </ul>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
};

export default Dashboard;
