import { Badge, Tooltip } from 'antd';
import { ConnectedSite } from 'background/service/permission';
import clsx from 'clsx';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { matomoRequestEvent } from '@/utils/matomo-request';
import IconAlertRed from 'ui/assets/alert-red.svg';
import { ReactComponent as RcIconQuene } from 'ui/assets/dashboard/quene.svg';
import { ReactComponent as RcIconSecurity } from 'ui/assets/dashboard/security.svg';
import { ReactComponent as RcIconSendToken } from 'ui/assets/dashboard/sendtoken.svg';
import { ReactComponent as RcIconSwap } from 'ui/assets/dashboard/swap.svg';
import { ReactComponent as RcIconReceive } from 'ui/assets/dashboard/receive.svg';
import { ReactComponent as RcIconBridge } from 'ui/assets/dashboard/bridge.svg';
import { ReactComponent as RcIconNFT } from 'ui/assets/dashboard/nft.svg';
import { ReactComponent as RcIconTransactions } from 'ui/assets/dashboard/transactions.svg';
import { ReactComponent as RcIconAddresses } from 'ui/assets/dashboard/addresses.svg';
import { ReactComponent as RcIconEco } from 'ui/assets/dashboard/icon-eco.svg';
import { ReactComponent as RcIconMoreSettings } from 'ui/assets/dashboard/more-settings.svg';
import { ReactComponent as RCIconRabbyMobile } from 'ui/assets/dashboard/rabby-mobile.svg';
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
import { CHAINS_ENUM, ThemeIconType, KEYRING_TYPE } from '@/constant';
import { useAsync } from 'react-use';
import { useRabbySelector } from '@/ui/store';
import { GasPriceBar } from '../GasPriceBar';
import { ClaimRabbyFreeGasBadgeModal } from '../ClaimRabbyBadgeModal/freeGasBadgeModal';
import { useTranslation } from 'react-i18next';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { EcologyPopup } from '../EcologyPopup';
import { appIsDev } from '@/utils/env';
import { ga4 } from '@/utils/ga4';
import { findChainByID } from '@/utils/chain';
import RateModal from '@/ui/component/RateModal/RateModal';

export default function ChainAndSiteSelector({
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
}) {
  const { t } = useTranslation();
  const history = useHistory();
  const [currentConnectedSiteChain, setCurrentConnectedSiteChain] = useState(
    CHAINS_ENUM.ETH
  );
  const [drawerAnimation, setDrawerAnimation] = useState<string | null>(null);
  const [badgeModalVisible, setBadgeModalVisible] = useState(false);

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

  const [isShowEcology, setIsShowEcologyModal] = useState(false);

  const [safeSupportChains, setSafeSupportChains] = useState<CHAINS_ENUM[]>([]);

  const wallet = useWallet();

  const account = useRabbySelector((state) => state.account.currentAccount);

  const [approvalRiskAlert, setApprovalRiskAlert] = useState(0);

  const { value: approvalState } = useAsync(async () => {
    if (
      account?.address &&
      (account.type !== KEYRING_TYPE.WatchAddressKeyring || appIsDev)
    ) {
      const data = await wallet.openapi.approvalStatus(account.address);
      return data;
    }
    return;
  }, [account?.address]);

  const isSafe = useMemo(() => {
    return account?.type === KEYRING_TYPE.GnosisKeyring;
  }, [account]);

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

  const getSafeNetworks = async () => {
    if (!account) return;
    const chainIds = await wallet.getGnosisNetworkIds(account.address);
    const chains: CHAINS_ENUM[] = [];
    chainIds.forEach((id) => {
      const chain = findChainByID(Number(id));
      if (chain) {
        chains.push(chain.enum);
      }
    });
    setSafeSupportChains(chains);
  };

  useEffect(() => {
    if (isSafe) {
      getSafeNetworks();
    }
  }, [isSafe]);

  type IPanelItem = {
    icon: ThemeIconType;
    content: string;
    onClick: import('react').MouseEventHandler<HTMLElement>;
    badge?: number;
    badgeAlert?: boolean;
    badgeClassName?: string;
    iconSpin?: boolean;
    hideForGnosis?: boolean;
    showAlert?: boolean;
    disabled?: boolean;
    commingSoonBadge?: boolean;
    disableReason?: string;
    eventKey: string;
    iconClassName?: string;
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
      onClick: () => history.push('/send-poly?rbisource=dashboard'),
    } as IPanelItem,
    bridge: {
      icon: RcIconBridge,
      eventKey: 'Bridge',
      content: t('page.dashboard.home.panel.bridge'),
      onClick: () => {
        history.push('/bridge');
      },
    } as IPanelItem,
    receive: {
      icon: RcIconReceive,
      eventKey: 'Receive',
      content: t('page.dashboard.home.panel.receive'),
      onClick: () => {
        setIsShowReceiveModal(true);
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
    ecology: {
      icon: RcIconEco,
      eventKey: 'Ecology',
      content: t('page.dashboard.home.panel.ecology'),
      onClick: () => {
        setIsShowEcologyModal(true);
      },
    } as IPanelItem,
    mobile: {
      icon: RCIconRabbyMobile,
      eventKey: 'Rabby Mobile',
      content: t('page.dashboard.home.panel.mobile'),
      iconClassName: 'icon-rabby-mobile',
      onClick: () => {
        openInternalPageInTab('sync');
      },
    } as IPanelItem,
  };

  let pickedPanelKeys: (keyof typeof panelItems)[] = [];

  if (isGnosis) {
    pickedPanelKeys = [
      'swap',
      'send',
      'receive',
      'bridge',
      'transactions',
      'nft',
      'security',
      'mobile',
      'more',
    ];
  } else {
    pickedPanelKeys = [
      'swap',
      'send',
      'receive',
      'bridge',
      'transactions',
      'nft',
      'security',
      'mobile',
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

                  ga4.fireEvent(`Entry_${item.eventKey}`, {
                    event_category: 'Dashboard',
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
                    className={clsx(
                      {
                        alert: item.badgeAlert && !item.badgeClassName,
                      },
                      item.badgeClassName
                    )}
                  >
                    <ThemeIcon
                      src={item.icon}
                      className={clsx([item.iconSpin && 'icon-spin', 'images'])}
                    />
                  </Badge>
                ) : (
                  <ThemeIcon
                    src={item.icon}
                    className={clsx(['images', item.iconClassName])}
                  />
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
        showRPCStatus
        onChange={(chain) => {
          history.push(`/receive?rbisource=dashboard&chain=${chain}`);
          setIsShowReceiveModal(false);
        }}
        onCancel={() => {
          setIsShowReceiveModal(false);
        }}
        supportChains={isSafe ? safeSupportChains : undefined}
        disabledTips={t('page.dashboard.GnosisWrongChainAlertBar.notDeployed')}
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

      <EcologyPopup
        visible={isShowEcology}
        onClose={() => setIsShowEcologyModal(false)}
      />

      <RateModal />
    </div>
  );
}
