import { CHAINS_ENUM, KEYRING_TYPE, ThemeIconType } from '@/constant';
import RateModal from '@/ui/component/RateModal/RateModal';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { useRabbySelector } from '@/ui/store';
import { usePerpsHomePnl } from '@/ui/views/Perps/usePerpsHomePnl';
import { findChainByID } from '@/utils/chain';
import { appIsDev } from '@/utils/env';
import { ga4 } from '@/utils/ga4';
import { matomoRequestEvent } from '@/utils/matomo-request';
import { Badge, Col, Row, Skeleton, Tooltip } from 'antd';
import clsx from 'clsx';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { useAsync } from 'react-use';
import styled from 'styled-components';
import IconAlertRed from 'ui/assets/alert-red.svg';
import { ReactComponent as RcIconEco } from 'ui/assets/dashboard/icon-eco.svg';
import { ReactComponent as RcIconGift } from 'ui/assets/gift-14.svg';

import {
  RcIconApprovalsCC,
  RcIconBridgeCC,
  RcIconGasAccountCC,
  RcIconMobileSyncCC,
  RcIconSettingCC,
  RcIconNftCC,
  RcIconPerpsCC,
  RcIconPointsCC,
  RcIconReceiveCC,
  RcIconSendCC,
  RcIconSwapCC,
  RcIconTransactionsCC,
  RcIconSearchCC,
  RcIconDappsCC,
  RcIconManageCC,
} from 'ui/assets/dashboard/panel';

import { useGasAccountInfo } from '@/ui/views/GasAccount/hooks';
import ChainSelectorModal from 'ui/component/ChainSelector/Modal';
import {
  formatGasAccountUsdValueV2,
  openInternalPageInTab,
  splitNumberByStep,
  useWallet,
} from 'ui/utils';
import { ClaimRabbyFreeGasBadgeModal } from '../ClaimRabbyBadgeModal/freeGasBadgeModal';
import { EcologyPopup } from '../EcologyPopup';
import { Settings } from '../index';
import { RabbyPointsPopup } from '../RabbyPointsPopup';
import { RecentConnectionsPopup } from '../RecentConnections';
import { useScroll, useSize } from 'ahooks';

const Container = styled.div`
  position: relative;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5px;

  height: 264px;
  overflow: auto;

  border-radius: 8px;
  background-color: var(--r-neutral-line, #e0e5ec);

  .panel-item {
    height: 88px;
    width: 100%;
    cursor: pointer;

    background: var(--r-neutral-card1, #fff);

    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;

    &:hover {
      background: var(--r-blue-light1, #edf0ff);
    }

    &-icon {
      width: 24px;
      height: 24px;
      justify-self: center;
      margin-bottom: 6px;
      color: var(--r-neutral-title1, #192945);

      &.icon-spin {
        animation: icn-spin 1.5s linear infinite;
      }

      &.icon-rabby-mobile {
        width: 24px;
        height: 24px;
        margin-bottom: 4px;
      }

      &.icon-points {
        width: 24px;
        height: 24px;
        margin-bottom: 4px;
      }
    }

    &-label {
      font-weight: 500;
      font-size: 13px;
      line-height: 16px;
      color: var(--r-neutral-title-1, rgba(25, 41, 69, 1));
    }

    @keyframes icn-spin {
      100% {
        transform: rotate(360deg);
      }
    }

    .icon-alert {
      position: absolute;
      right: 33px;
      top: 7px;
    }
  }

  .ant-badge {
    .ant-badge-count {
      background-color: var(--r-blue-default, #7084ff);
      padding: 2px 6px;
      font-size: 13px;
      line-height: 1;
      height: 18px;
      border-radius: 90px;
      box-shadow: none;
    }
    &.alert .ant-badge-count {
      background-color: #ec5151;
    }
    &.round .ant-badge-count {
      padding: 2px 4.5px !important;
    }
  }
`;

export const DashboardPanel: React.FC<{ onSettingClick?(): void }> = ({
  onSettingClick,
}) => {
  const { t } = useTranslation();
  const history = useHistory();
  const { perpsPositionInfo, isFetching } = usePerpsHomePnl();

  const [badgeModalVisible, setBadgeModalVisible] = useState(false);

  const [isShowReceiveModal, setIsShowReceiveModal] = useState(false);

  const [isShowEcology, setIsShowEcologyModal] = useState(false);

  const [isShowRabbyPoints, setIsShowRabbyPoints] = useState(false);

  const [isShowDappsPopup, setIsShowDappsPopup] = useState(false);

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

  const isGnosis = useMemo(() => {
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
    if (isGnosis) {
      getSafeNetworks();
    }
  }, [isGnosis]);

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
    subContent?: React.ReactNode;
  };

  const giftUsdValue = useRabbySelector((s) => s.gift.giftUsdValue);
  const hasClaimedGift = useRabbySelector((s) => s.gift.hasClaimedGift);

  const hasGiftEligibility = useMemo(() => {
    return giftUsdValue > 0 && !hasClaimedGift;
  }, [giftUsdValue, hasClaimedGift]);

  const panelItems = {
    swap: {
      icon: RcIconSwapCC,
      eventKey: 'Swap',
      content: t('page.dashboard.home.panel.swap'),
      onClick: () => {
        history.push('/dex-swap?rbisource=dashboard');
      },
    } as IPanelItem,
    send: {
      icon: RcIconSendCC,
      eventKey: 'Send',
      content: t('page.dashboard.home.panel.send'),
      onClick: () => history.push('/send-token?rbisource=dashboard'),
    } as IPanelItem,
    bridge: {
      icon: RcIconBridgeCC,
      eventKey: 'Bridge',
      content: t('page.dashboard.home.panel.bridge'),
      onClick: () => {
        history.push('/bridge');
      },
    } as IPanelItem,
    receive: {
      icon: RcIconReceiveCC,
      eventKey: 'Receive',
      content: t('page.dashboard.home.panel.receive'),
      onClick: () => {
        setIsShowReceiveModal(true);
      },
    } as IPanelItem,
    // queue: {
    //   icon: RcIconTransactionsCC,
    //   eventKey: 'Queue',
    //   content: t('page.dashboard.home.panel.queue'),
    //   badge: gnosisPendingCount,
    //   onClick: () => {
    //     history.push('/gnosis-queue');
    //   },
    // } as IPanelItem,
    transactions: {
      icon: RcIconTransactionsCC,
      eventKey: 'Transactions',
      content: t('page.dashboard.home.panel.transactions'),
      onClick: () => {
        history.push('/history');
      },
    } as IPanelItem,
    security: {
      icon: RcIconApprovalsCC,
      eventKey: 'Approvals',
      content: t('page.dashboard.home.panel.approvals'),
      onClick: async (evt) => {
        openInternalPageInTab('approval-manage');
      },
      badge: approvalRiskAlert,
      badgeAlert: approvalRiskAlert > 0,
    } as IPanelItem,
    more: {
      icon: RcIconSettingCC,
      eventKey: 'More',
      content: t('page.dashboard.home.panel.setting'),
      onClick: onSettingClick,
    } as IPanelItem,
    nft: {
      icon: RcIconNftCC,
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
    gasAccount: {
      icon: RcIconGasAccountCC,
      eventKey: 'GasAccount',
      content: t('page.dashboard.home.panel.gasAccount'),
      onClick: () => {
        history.push('/gas-account');
      },
      subContent: hasGiftEligibility ? (
        <div className="absolute top-[6px] right-[6px]">
          <div
            className={clsx(
              'text-r-green-default text-[10px] leading-[12px] font-medium',
              'flex items-center px-[3px] py-[2px] rounded-[4px] bg-r-green-light'
            )}
          >
            <RcIconGift viewBox="0 0 14 14" />
            {Number.isInteger(giftUsdValue)
              ? '$' + splitNumberByStep(giftUsdValue)
              : formatGasAccountUsdValueV2(giftUsdValue)}
          </div>
        </div>
      ) : null,
    } as IPanelItem,
    points: {
      icon: RcIconPointsCC,
      eventKey: 'Rabby Points',
      content: t('page.dashboard.home.panel.rabbyPoints'),
      onClick: () => {
        setIsShowRabbyPoints(true);
      },
    } as IPanelItem,
    mobile: {
      icon: RcIconMobileSyncCC,
      eventKey: 'Rabby Mobile',
      content: t('page.dashboard.home.panel.mobile'),
      onClick: () => {
        openInternalPageInTab('sync');
      },
    } as IPanelItem,
    perps: {
      icon: RcIconPerpsCC,
      eventKey: 'Perps',
      iconClassName: 'icon-perps',
      subContent: perpsPositionInfo.show ? (
        <div
          className={clsx(
            'absolute bottom-[4px] text-[11px] leading-[13px] font-medium',
            perpsPositionInfo.pnl > 0
              ? 'text-r-green-default'
              : 'text-r-red-default'
          )}
        >
          {perpsPositionInfo.pnl >= 0 ? '+' : '-'}$
          {splitNumberByStep(Math.abs(perpsPositionInfo.pnl).toFixed(2))}
        </div>
      ) : isFetching ? (
        <div className="absolute bottom-[4px] text-[11px] font-medium">
          <Skeleton.Button
            active={true}
            className="h-[10px] block rounded-[2px]"
            style={{ width: 42 }}
          />
        </div>
      ) : null,
      content: t('page.dashboard.home.panel.perps'),
      onClick: () => {
        history.push('/perps');
      },
    } as IPanelItem,
    searchDapp: {
      icon: RcIconSearchCC,
      eventKey: 'Search Dapp',
      content: t('page.dashboard.home.panel.searchDapp'),
      onClick: () => {
        openInternalPageInTab('dapp-search');
      },
    } as IPanelItem,
    dapps: {
      icon: RcIconDappsCC,
      eventKey: 'Dapps ',
      content: t('page.dashboard.home.panel.dapps'),
      onClick: () => {
        setIsShowDappsPopup(true);
      },
    } as IPanelItem,
    manageAddress: {
      icon: RcIconManageCC,
      eventKey: 'Manage Address',
      content: t('page.dashboard.home.panel.manageAddress'),
      onClick: () => {
        history.push('/settings/address');
      },
    } as IPanelItem,
  };

  const pickedPanelKeys = useMemo<(keyof typeof panelItems)[]>(() => {
    return isGnosis
      ? [
          'swap',
          'send',
          'bridge',
          'receive',
          'transactions',
          'security',
          'perps',
          'points',
          'mobile',
          'nft',
          'gasAccount',
          'searchDapp',
          'dapps',
          'manageAddress',
          'more',
        ]
      : [
          'swap',
          'send',
          'bridge',
          'receive',
          'transactions',
          'security',
          'perps',
          'points',
          'mobile',
          'nft',
          'gasAccount',
          'searchDapp',
          'dapps',
          'manageAddress',
          'more',
        ];
  }, [isGnosis]);

  const ref = useRef<HTMLDivElement>(null);
  const scroll = useScroll(ref);
  const size = useSize(ref);

  return (
    <div className="relative group">
      <Container ref={ref}>
        {pickedPanelKeys.map((panelKey, index) => {
          const item = panelItems[panelKey] as IPanelItem;
          if (item.hideForGnosis && isGnosis) return <></>;
          return (
            <div key={panelKey}>
              {item.disabled ? (
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
                    <div className="panel-item-label">{item.content} </div>
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
                  className="panel-item"
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
                        className={clsx([
                          item.iconSpin && 'icon-spin',
                          'panel-item-icon',
                        ])}
                      />
                    </Badge>
                  ) : (
                    <ThemeIcon
                      src={item.icon}
                      className={clsx(['panel-item-icon', item.iconClassName])}
                    />
                  )}
                  <div className="panel-item-label">{item.content}</div>
                  {item.subContent}
                  {item.commingSoonBadge && (
                    <div className="coming-soon-badge">
                      {t('page.dashboard.home.soon')}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </Container>
      <div className="absolute right-[-10px] top-[50%] translate-y-[-50%] hidden group-hover:block">
        <div className="w-[2px] h-[80px] bg-r-blue-light2 rounded-full relative">
          <div
            className="w-[2px] h-[50px] bg-r-blue-default rounded-full"
            style={{
              transform: `translateY(${
                ((scroll?.top || 0) / (size?.height || 264)) * 100
              }%)`,
            }}
          ></div>
        </div>
      </div>
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
        supportChains={isGnosis ? safeSupportChains : undefined}
        disabledTips={t('page.dashboard.GnosisWrongChainAlertBar.notDeployed')}
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
      <RabbyPointsPopup
        visible={isShowRabbyPoints}
        onClose={() => setIsShowRabbyPoints(false)}
      />
      <RateModal />

      <RecentConnectionsPopup
        visible={isShowDappsPopup}
        onClose={() => {
          setIsShowDappsPopup(false);
        }}
      />
    </div>
  );
};
