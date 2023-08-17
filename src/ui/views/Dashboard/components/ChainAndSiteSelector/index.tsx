import { Badge, Tooltip } from 'antd';
import { ConnectedSite } from 'background/service/permission';
import clsx from 'clsx';
import React, { useCallback, useEffect, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { matomoRequestEvent } from '@/utils/matomo-request';
import IconAlertRed from 'ui/assets/alert-red.svg';
import IconQuene from 'ui/assets/dashboard/quene.svg';
import IconSecurity from 'ui/assets/dashboard/security.svg';
import IconSendToken from 'ui/assets/dashboard/sendtoken.png';
import IconSwap from 'ui/assets/dashboard/swap.svg';
import IconReceive from 'ui/assets/dashboard/receive.svg';
import IconGasTopUp from 'ui/assets/dashboard/gas-top-up.svg';
import IconNFT from 'ui/assets/dashboard/nft.svg';
import IconTransactions from 'ui/assets/dashboard/transactions.png';
import IconAddresses from 'ui/assets/dashboard/addresses.svg';
import IconFeedback from 'ui/assets/dashboard/feedback.svg';
import IconMoreSettings from 'ui/assets/dashboard/more-settings.svg';
import IconDrawer from 'ui/assets/drawer.png';
import {
  getCurrentConnectSite,
  openInternalPageInTab,
  useWallet,
} from 'ui/utils';
import { CurrentConnection } from '../CurrentConnection';
import ChainSelectorModal from 'ui/component/ChainSelector/Modal';
import { RecentConnections, Settings } from '../index';
import './style.less';
import { CHAINS_ENUM } from '@/constant';
import { useAsync } from 'react-use';
import { useRabbySelector } from '@/ui/store';
import FeedbackPopup from '../Feedback';
import { GasPriceBar } from '../GasPriceBar';
import { ClaimRabbyBadgeModal } from '../ClaimRabbyBadgeModal';
import { useTranslation } from 'react-i18next';

export default ({
  gnosisPendingCount,
  onChange,
  connectionAnimation,
  showDrawer,
  hideAllList,
  isGnosis,
  setDashboardReload,
}: {
  onChange(site: ConnectedSite | null | undefined): void;
  showChain?: boolean;
  connectionAnimation?: string;
  showDrawer?: boolean;
  hideAllList?(): void;
  isGnosis: boolean;
  higherBottom: boolean;
  pendingTxCount?: number;
  gnosisPendingCount?: number;
  setDashboardReload(): void;
}) => {
  const { t } = useTranslation();
  const history = useHistory();
  const [currentConnectedSiteChain, setCurrentConnectedSiteChain] = useState(
    CHAINS_ENUM.ETH
  );
  const [drawerAnimation, setDrawerAnimation] = useState<string | null>(null);
  const [connectedDappsVisible, setConnectedDappsVisible] = useState(false);
  const [badgeModalVisible, setBadgeModalVisible] = useState(false);

  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [settingVisible, setSettingVisible] = useState(false);
  const [currentConnect, setCurrentConnect] = useState<
    ConnectedSite | null | undefined
  >(null);
  const { state } = useLocation<{
    trigger?: string;
    showChainsModal?: boolean;
  }>();
  const { showChainsModal = false, trigger } = state ?? {};
  const [isShowReceiveModal, setIsShowReceiveModal] = useState(
    trigger === 'receive' && showChainsModal
  );
  const wallet = useWallet();

  const account = useRabbySelector((state) => state.account.currentAccount);

  const [approvalRiskAlert, setApprovalRiskAlert] = useState(0);

  const { value: approvalState } = useAsync(async () => {
    if (account?.address) {
      const data = await wallet.openapi.approvalStatus(account.address);
      return data;
    }
    return;
  }, [account?.address]);

  useEffect(() => {
    if (approvalState) {
      setApprovalRiskAlert(
        approvalState.reduce(
          (pre, now) =>
            pre + now.nft_approval_danger_cnt + now.token_approval_danger_cnt,
          0
        )
      );
    } else {
      setApprovalRiskAlert(0);
    }
  }, [approvalState]);

  const getCurrentSite = useCallback(async () => {
    const current = await getCurrentConnectSite(wallet);
    setCurrentConnect(current);
  }, []);

  const toggleShowMoreSettings = () => {
    setSettingVisible(!settingVisible);
    setDashboardReload();
  };

  const showFeedbackModal = useCallback(
    (nextVal = !feedbackVisible) => {
      setFeedbackVisible(nextVal);
    },
    [feedbackVisible]
  );

  useEffect(() => {
    getCurrentSite();
  }, []);

  useEffect(() => {
    if (currentConnect?.chain) {
      setCurrentConnectedSiteChain(currentConnect?.chain);
    }
  }, [currentConnect?.chain]);

  useEffect(() => {
    onChange(currentConnect);
  }, [currentConnect]);

  useEffect(() => {
    if (showDrawer) {
      setDrawerAnimation('fadeInDrawer');
    } else {
      if (drawerAnimation) {
        setTimeout(() => {
          setDrawerAnimation('fadeOutDrawer');
        }, 100);
      }
    }
  }, [showDrawer]);

  type IPanelItem = {
    icon: string;
    content: string;
    onClick: import('react').MouseEventHandler<HTMLElement>;
    badge?: number;
    badgeAlert?: boolean;
    iconSpin?: boolean;
    hideForGnosis?: boolean;
    showAlert?: boolean;
    disabled?: boolean;
    commingSoonBadge?: boolean;
    disableReason?: string;
    eventKey: string;
  };

  const panelItems = {
    swap: {
      icon: IconSwap,
      eventKey: 'Swap',
      content: t('page.dashboard.home.panel.swap'),
      onClick: () => {
        history.push('/dex-swap?rbisource=dashboard');
      },
    } as IPanelItem,
    send: {
      icon: IconSendToken,
      eventKey: 'Send',
      content: t('page.dashboard.home.panel.send'),
      onClick: () => history.push('/send-token?rbisource=dashboard'),
    } as IPanelItem,
    receive: {
      icon: IconReceive,
      eventKey: 'Receive',
      content: t('page.dashboard.home.panel.receive'),
      onClick: () => {
        setIsShowReceiveModal(true);
      },
    } as IPanelItem,
    gasTopUp: {
      icon: IconGasTopUp,
      eventKey: 'Gas Top Up',
      content: t('page.dashboard.home.panel.gasTopUp'),
      onClick: () => {
        history.push('/gas-top-up');
      },
    } as IPanelItem,
    queue: {
      icon: IconQuene,
      eventKey: 'Queue',
      content: t('page.dashboard.home.panel.queue'),
      badge: gnosisPendingCount,
      onClick: () => {
        history.push('/gnosis-queue');
      },
    } as IPanelItem,
    transactions: {
      icon: IconTransactions,
      eventKey: 'Transactions',
      content: t('page.dashboard.home.panel.transactions'),
      onClick: () => {
        history.push('/history');
      },
    } as IPanelItem,
    security: {
      icon: IconSecurity,
      eventKey: 'Approvals',
      content: t('page.dashboard.home.panel.approvals'),
      onClick: async (evt) => {
        // history.push('/popup/approval-manage');
        if (process.env.NODE_ENV !== 'production' && evt.ctrlKey) {
          history.push('/popup/approval-manage');
          return;
        }

        openInternalPageInTab('approval-manage');
      },
      badge: approvalRiskAlert,
      badgeAlert: approvalRiskAlert > 0,
    } as IPanelItem,
    feedback: {
      icon: IconFeedback,
      eventKey: 'Feedback',
      content: t('page.dashboard.home.panel.feedback'),
      onClick: showFeedbackModal,
    } as IPanelItem,
    more: {
      icon: IconMoreSettings,
      eventKey: 'More',
      content: t('page.dashboard.home.panel.more'),
      onClick: toggleShowMoreSettings,
    } as IPanelItem,
    address: {
      icon: IconAddresses,
      eventKey: 'Manage Address',
      content: t('page.dashboard.home.panel.manageAddress'),
      onClick: () => {
        history.push('/settings/address');
      },
    } as IPanelItem,
    nft: {
      icon: IconNFT,
      eventKey: 'NFT',
      content: t('page.dashboard.home.panel.nft'),
      onClick: () => {
        history.push('/nft');
      },
    } as IPanelItem,
  };

  let pickedPanelKeys: (keyof typeof panelItems)[] = [];

  if (isGnosis) {
    pickedPanelKeys = [
      'swap',
      'send',
      'receive',
      'nft',
      // 'queue',
      'transactions',
      'gasTopUp',
      'security',
      'feedback',
      'more',
    ];
  } else {
    pickedPanelKeys = [
      'swap',
      'send',
      'receive',
      'nft',
      'transactions',
      'gasTopUp',
      'security',
      'feedback',
      'more',
    ];
  }

  return (
    <div className={clsx('recent-connections', connectionAnimation)}>
      <img
        src={IconDrawer}
        className={clsx(
          'bottom-drawer',
          drawerAnimation,
          drawerAnimation === 'fadeInDrawer' ? 'h-[40px] z-10' : 'h-[0] z-0'
        )}
        onClick={hideAllList}
      />
      <div className="pannel">
        <div className="direction-pannel">
          {pickedPanelKeys.map((panelKey, index) => {
            const item = panelItems[panelKey] as IPanelItem;
            if (item.hideForGnosis && isGnosis) return <></>;
            return item.disabled ? (
              <Tooltip
                {...(item.commingSoonBadge && { visible: false })}
                title={
                  item.disableReason || t('page.dashboard.home.comingSoon')
                }
                overlayClassName="rectangle direction-tooltip"
                autoAdjustOverflow={false}
              >
                <div key={index} className="disable-direction">
                  <img src={item.icon} className="images" />
                  <div>{item.content} </div>
                </div>
              </Tooltip>
            ) : (
              <div
                key={index}
                onClick={(evt) => {
                  matomoRequestEvent({
                    category: 'Dashboard',
                    action: 'clickEntry',
                    label: item.eventKey,
                  });
                  item?.onClick(evt);
                }}
                className="direction pointer"
              >
                {item.showAlert && (
                  <img src={IconAlertRed} className="icon icon-alert" />
                )}
                {item.badge ? (
                  <Badge
                    count={item.badge}
                    size="small"
                    className={item.badgeAlert ? 'alert' : ''}
                  >
                    <img
                      src={item.icon}
                      className={[item.iconSpin && 'icon-spin', 'images']
                        .filter(Boolean)
                        .join(' ')}
                    />
                  </Badge>
                ) : (
                  <img src={item.icon} className="images" />
                )}
                <div>{item.content} </div>
                {item.commingSoonBadge && (
                  <div className="coming-soon-badge">
                    {t('page.dashboard.home.soon')}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <GasPriceBar currentConnectedSiteChain={currentConnectedSiteChain} />

      <CurrentConnection
        onChainChange={(chain) => {
          setCurrentConnectedSiteChain(chain);
          if (currentConnect) {
            onChange({
              ...currentConnect,
              chain,
            });
          }
        }}
      />
      <ChainSelectorModal
        className="receive-chain-select-modal"
        value={CHAINS_ENUM.ETH}
        visible={isShowReceiveModal}
        onChange={(chain) => {
          history.push(`/receive?rbisource=dashboard&chain=${chain}`);
          setIsShowReceiveModal(false);
        }}
        onCancel={() => {
          setIsShowReceiveModal(false);
        }}
      />

      <Settings
        visible={settingVisible}
        onClose={toggleShowMoreSettings}
        onOpenConnectedDapps={() => {
          setConnectedDappsVisible(true);
          setSettingVisible(false);
        }}
        onOpenBadgeModal={() => {
          setBadgeModalVisible(true);
          setSettingVisible(false);
        }}
      />
      <ClaimRabbyBadgeModal
        visible={badgeModalVisible}
        onCancel={() => {
          setBadgeModalVisible(false);
        }}
      />

      <FeedbackPopup
        visible={feedbackVisible}
        onClose={() => showFeedbackModal(false)}
      />
      <RecentConnections
        visible={connectedDappsVisible}
        onClose={() => {
          setConnectedDappsVisible(false);
        }}
      />
    </div>
  );
};
