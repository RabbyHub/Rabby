import { Input, message, Popover } from 'antd';
import ClipboardJS from 'clipboard';
import clsx from 'clsx';
import { Trans, useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { matomoRequestEvent } from '@/utils/matomo-request';
import {
  KEYRING_CLASS,
  KEYRING_ICONS,
  KEYRING_ICONS_WHITE,
  KEYRING_TYPE,
  KEYRING_TYPE_TEXT,
  WALLET_BRAND_CONTENT,
  EVENTS,
} from 'consts';
import QRCode from 'qrcode.react';
import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useInterval } from 'react-use';
import IconAddressCopy from 'ui/assets/address-copy.png';
import IconCorrect from 'ui/assets/dashboard/contacts/correct.png';
import IconUnCorrect from 'ui/assets/dashboard/contacts/uncorrect.png';
import IconEditPen from 'ui/assets/editpen.svg';
import { ReactComponent as RcIconCopy } from 'ui/assets/icon-copy.svg';

import IconSuccess from 'ui/assets/success.svg';
import { AddressViewer, Modal } from 'ui/component';
import {
  connectStore,
  useRabbyDispatch,
  useRabbyGetter,
  useRabbySelector,
} from 'ui/store';
import { useWallet } from 'ui/utils';
import {
  BalanceView,
  ChainAndSiteSelector,
  GnosisWrongChainAlertBar,
} from './components';
import './style.less';

import PendingApproval from './components/PendingApproval';
import PendingTxs from './components/PendingTxs';
import { getKRCategoryByType } from '@/utils/transaction';

import { ReactComponent as IconArrowRight } from 'ui/assets/dashboard/arrow-right.svg';
import Queue from './components/Queue';
import { copyAddress } from '@/ui/utils/clipboard';
import { useWalletConnectIcon } from '@/ui/component/WalletConnect/useWalletConnectIcon';
import { useGnosisNetworks } from '@/ui/hooks/useGnosisNetworks';
import { useGnosisPendingTxs } from '@/ui/hooks/useGnosisPendingTxs';
import { CommonSignal } from '@/ui/component/ConnectStatus/CommonSignal';
import { useHomeBalanceViewOuterPrefetch } from './components/BalanceView/useHomeBalanceView';
import { EcologyPopup } from './components/EcologyPopup';
import { GasAccountDashBoardHeader } from '../GasAccount/components/DashBoardHeader';
import { useGnosisPendingCount } from '@/ui/hooks/useGnosisPendingCount';

const Dashboard = () => {
  const history = useHistory();
  const wallet = useWallet();
  const dispatch = useRabbyDispatch();
  const { alianName, currentAccount, accountsList } = useRabbySelector((s) => ({
    alianName: s.account.alianName,
    currentAccount: s.account.currentAccount,
    accountsList: s.accountToDisplay.accountsList,
  }));

  const { pendingTransactionCount: pendingTxCount } = useRabbySelector((s) => ({
    ...s.transactions,
  }));

  const { firstNotice, updateContent, version } = useRabbySelector((s) => ({
    ...s.appVersion,
  }));

  const [copySuccess, setCopySuccess] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [clicked, setClicked] = useState(false);
  const [startEdit, setStartEdit] = useState(false);
  const [displayName, setDisplayName] = useState<string>('');
  const [showChain, setShowChain] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [showAssets, setShowAssets] = useState(false);
  const [showNFT, setShowNFT] = useState(false);
  const [topAnimate, setTopAnimate] = useState('');
  const [connectionAnimation, setConnectionAnimation] = useState('');
  const [pendingApprovalCount, setPendingApprovalCount] = useState(0);

  const isGnosis = useRabbyGetter((s) => s.chains.isCurrentAccountGnosis);
  const gnosisPendingCount = useRabbySelector(
    (s) => s.chains.gnosisPendingCount
  );

  const [dashboardReload, setDashboardReload] = useState(false);
  const getCurrentAccount = async () => {
    const account = await dispatch.account.getCurrentAccountAsync();
    if (!account) {
      history.replace('/no-address');
      return;
    }
  };

  useInterval(() => {
    if (!currentAccount) return;
    if (currentAccount.type === KEYRING_TYPE.GnosisKeyring) return;

    dispatch.transactions.getPendingTxCountAsync(currentAccount.address);
  }, 30000);

  useEffect(() => {
    getCurrentAccount();
  }, []);

  useGnosisNetworks(
    {
      address:
        currentAccount?.address &&
        currentAccount?.type === KEYRING_TYPE.GnosisKeyring
          ? currentAccount.address
          : '',
    },
    {
      onBefore() {
        dispatch.chains.setField({
          gnosisNetworkIds: [],
        });
      },
      onSuccess(res) {
        if (res) {
          dispatch.chains.setField({
            gnosisNetworkIds: res,
          });
        }
      },
    }
  );

  useGnosisPendingCount(
    {
      address:
        currentAccount?.address &&
        currentAccount?.type === KEYRING_TYPE.GnosisKeyring
          ? currentAccount.address
          : '',
    },
    {
      onBefore() {
        dispatch.chains.setField({
          gnosisPendingCount: 0,
        });
      },
      onSuccess(total) {
        dispatch.chains.setField({
          gnosisPendingCount: total || 0,
        });
      },
    }
  );

  useEffect(() => {
    if (currentAccount) {
      if (currentAccount.type !== KEYRING_TYPE.GnosisKeyring) {
        dispatch.transactions.getPendingTxCountAsync(currentAccount.address);
      }

      wallet
        .getAlianName(currentAccount?.address.toLowerCase())
        .then((name) => {
          dispatch.account.setField({ alianName: name });
          setDisplayName(name!);
        });
    }
  }, [currentAccount]);

  useEffect(() => {
    if (dashboardReload) {
      if (currentAccount) {
        dispatch.transactions.getPendingTxCountAsync(currentAccount.address);
      }
      setDashboardReload(false);
      getCurrentAccount();
      dispatch.accountToDisplay.getAllAccountsToDisplay();
    }
  }, [dashboardReload]);

  useEffect(() => {
    (async () => {
      await dispatch.addressManagement.getHilightedAddressesAsync();
      dispatch.accountToDisplay.getAllAccountsToDisplay();
      const pendingCount = await wallet.getPendingApprovalCount();
      setPendingApprovalCount(pendingCount);
    })();
  }, []);

  useEffect(() => {
    if (clicked) {
      dispatch.accountToDisplay.getAllAccountsToDisplay();
    }
  }, [clicked]);

  const handleCopyCurrentAddress = () => {
    const { t } = useTranslation();
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
        duration: 3,
        icon: <i />,
        content: (
          <div>
            <div className="flex gap-4 mb-4">
              <img src={IconSuccess} alt="" />
              {t('global.copied')}
            </div>
            <div className="text-white">{currentAccount!.address}</div>
          </div>
        ),
      });
      matomoRequestEvent({
        category: 'AccountInfo',
        action: 'popupCopyAddress',
        label: [
          getKRCategoryByType(currentAccount?.type),
          currentAccount?.brandName,
        ].join('|'),
      });
      clipboard.destroy();
    });
  };

  const handleAlianNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    dispatch.account.setField({ alianName: e.target.value });
  };

  const alianNameConfirm = async (e) => {
    e.stopPropagation();
    if (!alianName) {
      return;
    }
    setStartEdit(false);
    await wallet.updateAlianName(
      currentAccount?.address?.toLowerCase() || '',
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
      dispatch.accountToDisplay.setField({ accountsList: newAccountList });
    }
  };
  const gotoGasAccount = () => {
    matomoRequestEvent({
      category: 'Front Page Click',
      action: 'Click',
      label: 'Gas Account',
    });
    history.push('/gas-account');
  };
  const { dashboardBalanceCacheInited } = useHomeBalanceViewOuterPrefetch(
    currentAccount?.address
  );

  useEffect(() => {
    dispatch.appVersion.checkIfFirstLoginAsync();
  }, [dispatch]);

  const hideAllList = () => {
    setShowAssets(false);
    setShowChain(false);
    setShowToken(false);
    setShowNFT(false);
    setConnectionAnimation('fadeInBottom');
    setTopAnimate('fadeInTop');
  };

  const showGnosisWrongChainAlert = useRabbyGetter(
    (s) => s.chains.isShowGnosisWrongChainAlert
  );
  const opacity60 =
    currentAccount?.type === KEYRING_CLASS.MNEMONIC ||
    currentAccount?.type === KEYRING_CLASS.PRIVATE_KEY ||
    currentAccount?.type === KEYRING_CLASS.WATCH;
  const showGnosisAlert = isGnosis && showGnosisWrongChainAlert && !showChain;

  const switchAddress = () => {
    matomoRequestEvent({
      category: 'Front Page Click',
      action: 'Click',
      label: 'Change Address',
    });
    history.push('/switch-address');
  };

  const brandIcon = useWalletConnectIcon(currentAccount);
  const { t } = useTranslation();

  return (
    <>
      <div
        className={clsx('dashboard', {
          'metamask-active': showGnosisWrongChainAlert && isGnosis,
        })}
      >
        <div className={clsx('main', showChain && 'show-chain-bg')}>
          {currentAccount && (
            <div
              className={clsx('flex header items-center relative', topAnimate)}
            >
              <div
                className="h-[36px] flex header-wrapper items-center relative mr-0"
                onClick={switchAddress}
              >
                <Popover
                  content={null}
                  trigger="click"
                  visible={false}
                  placement="bottomLeft"
                  overlayClassName="switch-popover"
                >
                  <div className="relative mr-[4px]">
                    <img
                      className={clsx(
                        'icon w-[24px] h-[24px]',
                        opacity60 && 'opacity-60'
                      )}
                      src={
                        brandIcon ||
                        WALLET_BRAND_CONTENT[currentAccount.brandName]?.image ||
                        KEYRING_ICONS_WHITE[currentAccount.type]
                      }
                    />
                    <CommonSignal
                      type={currentAccount.type}
                      brandName={currentAccount.brandName}
                      address={currentAccount.address}
                    />
                  </div>
                  <div
                    className="text-15 text-white ml-6 mr-6 dashboard-name"
                    title={displayName}
                  >
                    {displayName}
                  </div>
                  <div className="current-address">
                    {currentAccount && (
                      <AddressViewer
                        address={currentAccount.address}
                        showArrow={false}
                        className={'text-12 text-white opacity-60'}
                      />
                    )}
                  </div>
                  <IconArrowRight className="ml-6" />
                </Popover>
              </div>

              <RcIconCopy
                viewBox="0 0 18 18"
                className="copyAddr actionIcon w-16 h-16 ml-8 mr-16"
                onClick={() => {
                  copyAddress(currentAccount.address);
                  matomoRequestEvent({
                    category: 'AccountInfo',
                    action: 'headCopyAddress',
                    label: [
                      getKRCategoryByType(currentAccount?.type),
                      currentAccount?.brandName,
                    ].join('|'),
                  });
                }}
              />

              <div className="ml-auto cursor-pointer" onClick={gotoGasAccount}>
                <GasAccountDashBoardHeader />
              </div>
            </div>
          )}
          {dashboardBalanceCacheInited && (
            <BalanceView currentAccount={currentAccount} />
          )}
          {isGnosis ? (
            <Queue
              count={gnosisPendingCount || 0}
              className={clsx(
                'transition-all',
                showChain ? 'opacity-0 pointer-events-none' : 'opacity-100'
              )}
            />
          ) : (
            pendingTxCount > 0 &&
            !showChain && <PendingTxs pendingTxCount={pendingTxCount} />
          )}
        </div>
        <ChainAndSiteSelector
          onChange={(currentConnection) => {
            dispatch.chains.setField({ currentConnection });
          }}
          connectionAnimation={connectionAnimation}
          showDrawer={showToken || showAssets || showNFT}
          hideAllList={hideAllList}
          gnosisPendingCount={gnosisPendingCount}
          isGnosis={isGnosis}
          higherBottom={isGnosis}
          setDashboardReload={() => setDashboardReload(true)}
        />
        {showGnosisAlert && <GnosisWrongChainAlertBar />}
      </div>
      <Modal
        visible={firstNotice && updateContent}
        title={t('page.dashboard.home.whatsNew')}
        className="first-notice"
        onCancel={() => {
          dispatch.appVersion.afterFirstLogin();
        }}
        maxHeight="420px"
      >
        <div>
          <p className="mb-12">{version}</p>
          <ReactMarkdown children={updateContent} remarkPlugins={[remarkGfm]} />
        </div>
      </Modal>
      <Modal
        visible={hovered}
        closable={false}
        onCancel={() => {
          setHovered(false);
          setStartEdit(false);
        }}
        className="address-popover"
      >
        <div
          className="flex flex-col items-center"
          onClick={() => setStartEdit(false)}
        >
          <div className="address-popover__info">
            <div className="left-container">
              <div className="flex items-center w-[188px]">
                <div className="brand-name">
                  {startEdit ? (
                    <Input
                      value={alianName}
                      defaultValue={alianName}
                      onChange={handleAlianNameChange}
                      onPressEnter={alianNameConfirm}
                      autoFocus={startEdit}
                      onClick={(e) => e.stopPropagation()}
                      maxLength={50}
                      min={0}
                      style={{ zIndex: 10 }}
                    />
                  ) : (
                    <span title={displayName} className="alias">
                      {displayName}
                    </span>
                  )}
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
                </div>
                {startEdit && (
                  <img
                    className="edit-name w-[16px] h-[16px]"
                    src={alianName ? IconCorrect : IconUnCorrect}
                    onClick={(e) => {
                      e.stopPropagation();
                      alianNameConfirm(e);
                    }}
                  />
                )}
              </div>
              <div className="address-display">
                {currentAccount?.address.toLowerCase()}{' '}
                <img
                  onClick={handleCopyCurrentAddress}
                  src={IconAddressCopy}
                  id={'copyIcon'}
                  className={clsx(
                    'ml-7 inline-block mb-2  w-[16px] h-[16px] pointer',
                    {
                      success: copySuccess,
                    }
                  )}
                />
              </div>
              <div className="import">
                {currentAccount && (
                  <img
                    className="icon icon-account-type w-[16px] h-[16px] pb-1 inline-block"
                    src={
                      KEYRING_ICONS[currentAccount.type] ||
                      WALLET_BRAND_CONTENT[currentAccount.brandName]?.image
                    }
                  />
                )}{' '}
                {(currentAccount?.type &&
                  KEYRING_TYPE_TEXT[currentAccount?.type]) ||
                  (currentAccount && (
                    <Trans
                      i18nKey="page.dashboard.home.importType"
                      values={{
                        type:
                          WALLET_BRAND_CONTENT[currentAccount?.brandName]?.name,
                      }}
                    />
                  ))}
              </div>
            </div>
            <div className="qrcode-container">
              <QRCode value={currentAccount?.address || ''} size={100} />
            </div>
          </div>
        </div>
      </Modal>
      {pendingApprovalCount > 0 && (
        <PendingApproval
          onRejectAll={() => {
            setPendingApprovalCount(0);
          }}
          count={pendingApprovalCount}
        />
      )}
    </>
  );
};

export default connectStore()(Dashboard);
