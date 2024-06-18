import { Badge, Tooltip } from 'antd';
import { ConnectedSite } from 'background/service/permission';
import clsx from 'clsx';
import React, { useCallback, useEffect, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { matomoRequestEvent } from '@/utils/matomo-request';
import IconAlertRed from 'ui/assets/alert-red.svg';
import IconQuene, {
  ReactComponent as RcIconQuene,
} from 'ui/assets/dashboard/quene.svg';
import IconSecurity, {
  ReactComponent as RcIconSecurity,
} from 'ui/assets/dashboard/security.svg';
import IconSendToken, {
  ReactComponent as RcIconSendToken,
} from 'ui/assets/dashboard/sendtoken.svg';
import IconSwap, {
  ReactComponent as RcIconSwap,
} from 'ui/assets/dashboard/swap.svg';
import IconReceive, {
  ReactComponent as RcIconReceive,
} from 'ui/assets/dashboard/receive.svg';
import IconGasTopUp, {
  ReactComponent as RcIconGasTopUp,
} from 'ui/assets/dashboard/gas-top-up.svg';
import IconNFT, {
  ReactComponent as RcIconNFT,
} from 'ui/assets/dashboard/nft.svg';
import IconTransactions, {
  ReactComponent as RcIconTransactions,
} from 'ui/assets/dashboard/transactions.svg';
import IconAddresses, {
  ReactComponent as RcIconAddresses,
} from 'ui/assets/dashboard/addresses.svg';
import { ReactComponent as RcIconClaimableRabbyPoints } from 'ui/assets/dashboard/claimable-points.svg';
import { ReactComponent as RcIconUnclaimableRabbyPoints } from 'ui/assets/dashboard/unclaimable-points.svg';

import IconMoreSettings, {
  ReactComponent as RcIconMoreSettings,
} from 'ui/assets/dashboard/more-settings.svg';
import IconDrawer from 'ui/assets/drawer.png';
import {
  getCurrentConnectSite,
  openInternalPageInTab,
  useWallet,
} from 'ui/utils';
import { CurrentConnection } from '../CurrentConnection';
import ChainSelectorModal from 'ui/component/ChainSelector/Modal';
import { Settings } from '../index';
import './style.less';
import { CHAINS_ENUM, ThemeIconType } from '@/constant';
import { useAsync } from 'react-use';
import { useRabbySelector } from '@/ui/store';
import { GasPriceBar } from '../GasPriceBar';
import { ClaimRabbyFreeGasBadgeModal } from '../ClaimRabbyBadgeModal/freeGasBadgeModal';
import { useTranslation } from 'react-i18next';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';

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
  const [badgeModalVisible, setBadgeModalVisible] = useState(false);

  const [rabbyPointsVisible, setRabbyPointVisible] = useState(false);

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
      const apiLevel = await wallet.getAPIConfig([], 'ApiLevel', false);
      if (apiLevel < 1) {
        const data = await wallet.openapi.approvalStatus(account.address);
        return data;
      } else {
        return [];
      }
    }
    return;
  }, [account?.address]);

  const { value: claimable } = useAsync(async () => {
    if (account?.address) {
      const data = await wallet.openapi.checkClaimInfoV2({
        id: account?.address,
      });
      return !!data?.claimable_points && data?.claimable_points > 0;
    }
    return false;
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
    icon: ThemeIconType;
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
      icon: RcIconSwap,
      eventKey: 'Swap',
      content: t('page.dashboard.home.panel.swap'),
      onClick: () => {
        history.push('/dex-swap?rbisource=dashboard');
      },
    } as IPanelItem,
    send: {
      icon: RcIconSendToken,
      eventKey: 'Send',
      content: t('page.dashboard.home.panel.send'),
      onClick: () => history.push('/send-token?rbisource=dashboard'),
    } as IPanelItem,
    receive: {
      icon: RcIconReceive,
      eventKey: 'Receive',
      content: t('page.dashboard.home.panel.receive'),
      onClick: () => {
        setIsShowReceiveModal(true);
      },
    } as IPanelItem,
    gasTopUp: {
      icon: RcIconGasTopUp,
      eventKey: 'Gas Top Up',
      content: t('page.dashboard.home.panel.gasTopUp'),
      onClick: () => {
        history.push('/gas-top-up');
      },
    } as IPanelItem,
    queue: {
      icon: RcIconQuene,
      eventKey: 'Queue',
      content: t('page.dashboard.home.panel.queue'),
      badge: gnosisPendingCount,
      onClick: () => {
        history.push('/gnosis-queue');
      },
    } as IPanelItem,
    transactions: {
      icon: RcIconTransactions,
      eventKey: 'Transactions',
      content: t('page.dashboard.home.panel.transactions'),
      onClick: () => {
        history.push('/history');
      },
    } as IPanelItem,
    security: {
      icon: RcIconSecurity,
      eventKey: 'Approvals',
      content: t('page.dashboard.home.panel.approvals'),
      onClick: async (evt) => {
        openInternalPageInTab('approval-manage');
      },
      badge: approvalRiskAlert,
      badgeAlert: approvalRiskAlert > 0,
    } as IPanelItem,
    feedback: {
      icon: claimable
        ? RcIconClaimableRabbyPoints
        : RcIconUnclaimableRabbyPoints,
      eventKey: 'Rabby Points',
      content: t('page.dashboard.home.panel.rabbyPoints'),
      onClick: () => {
        history.push('/rabby-points');
      },
    } as IPanelItem,
    more: {
      icon: RcIconMoreSettings,
      eventKey: 'More',
      content: t('page.dashboard.home.panel.more'),
      onClick: toggleShowMoreSettings,
    } as IPanelItem,
    address: {
      icon: RcIconAddresses,
      eventKey: 'Manage Address',
      content: t('page.dashboard.home.panel.manageAddress'),
      onClick: () => {
        history.push('/settings/address');
      },
    } as IPanelItem,
    nft: {
      icon: RcIconNFT,
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
                  <ThemeIcon src={item.icon} className="images" />
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
                  <ThemeIcon src={IconAlertRed} className="icon icon-alert" />
                )}
                {item.badge ? (
                  <Badge
                    count={item.badge}
                    size="small"
                    className={item.badgeAlert ? 'alert' : ''}
                  >
                    <ThemeIcon
                      src={item.icon}
                      className={[item.iconSpin && 'icon-spin', 'images']
                        .filter(Boolean)
                        .join(' ')}
                    />
                  </Badge>
                ) : (
                  <ThemeIcon src={item.icon} className="images" />
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
        onOpenBadgeModal={() => {
          setBadgeModalVisible(true);
          setSettingVisible(false);
        }}
      />
      <ClaimRabbyFreeGasBadgeModal
        visible={badgeModalVisible}
        onCancel={() => {
          setBadgeModalVisible(false);
        }}
      />
    </div>
  );
};
