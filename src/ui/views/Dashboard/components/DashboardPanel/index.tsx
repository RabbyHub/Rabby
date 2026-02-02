import { KEYRING_TYPE, ThemeIconType } from '@/constant';
import RateModal from '@/ui/component/RateModal/RateModal';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { usePerpsHomePnl } from '@/ui/views/Perps/hooks/usePerpsHomePnl';
import { appIsDev } from '@/utils/env';
import { ga4 } from '@/utils/ga4';
import { matomoRequestEvent } from '@/utils/matomo-request';
import {
  closestCenter,
  DndContext,
  DragOverlay,
  MeasuringStrategy,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { DragEndEvent } from '@dnd-kit/core/dist/types';
import { SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge, Skeleton, Tooltip } from 'antd';
import clsx from 'clsx';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { useAsync } from 'react-use';
import { createGlobalStyle } from 'styled-components';
import IconAlertRed from 'ui/assets/alert-red.svg';
import { ReactComponent as RcIconEco } from 'ui/assets/dashboard/icon-eco.svg';
import { ReactComponent as RcIconGift } from 'ui/assets/gift-14.svg';

import {
  RcIconApprovalsCC,
  RcIconBridgeCC,
  RcIconDappsCC,
  RcIconGasAccountCC,
  RcIconLampCC,
  RcIconManageCC,
  RcIconMobileSyncCC,
  RcIconNftCC,
  RcIconPerpsCC,
  RcIconPointsCC,
  RcIconPrediction,
  RcIconReceiveCC,
  RcIconSearchCC,
  RcIconSendCC,
  RcIconSettingCC,
  RcIconSwapCC,
  RcIconTransactionsCC,
} from 'ui/assets/dashboard/panel';

import { RcIconExternal1CC } from '@/ui/assets/dashboard';
import { useThemeMode } from '@/ui/hooks/usePreference';
import { usePerpsDefaultAccount } from '@/ui/views/Perps/hooks/usePerpsDefaultAccount';
import { useMemoizedFn, useMount, useScroll } from 'ahooks';
import { isEqual } from 'lodash';
import {
  formatGasAccountUsdValueV2,
  formatUsdValue,
  openInternalPageInTab,
  splitNumberByStep,
  useWallet,
} from 'ui/utils';
import { ClaimRabbyFreeGasBadgeModal } from '../ClaimRabbyBadgeModal/freeGasBadgeModal';
import { EcologyPopup } from '../EcologyPopup';
import { RabbyPointsPopup } from '../RabbyPointsPopup';
import { RecentConnectionsPopup } from '../RecentConnections';

const FOOTER_HEIGHT = 88;

const GlobalStyle = createGlobalStyle`
  .rabby-dashboard-panel-container {
    .dashboard-panel-grid {
      position: relative;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1px;

      scroll-snap-align: end;
    }

    .dashboard-panel-footer {
      display: flex;
      align-items: end;
      justify-content: center;
      margin-top: 1px;
      background-color: var(--r-neutral-bg-2, #f2f4f7);
      height: ${FOOTER_HEIGHT}px;

      position: relative;

      &:before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: var(--r-neutral-card1, #fff);
      }
    }

    .panel-item {
      height: 88px;
      width: 100%;

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
        text-align: center;
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
  }
`;

type IPanelItem = {
  icon: ThemeIconType;
  content: string;
  onClick: import('react').MouseEventHandler<HTMLElement>;
  badge?: number;
  badgeAlert?: boolean;
  badgeClassName?: string;
  iconSpin?: boolean;
  showAlert?: boolean;
  disabled?: boolean;
  commingSoonBadge?: boolean;
  disableReason?: string;
  eventKey: string;
  iconClassName?: string;
  subContent?: React.ReactNode;
  isFullscreen?: boolean;
};

const SortablePanelItem: React.FC<{
  panelKey: string;
  item: IPanelItem;
  isGnosis: boolean;
  index: number;
}> = ({ panelKey, item, isGnosis, index }) => {
  const { t } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: panelKey,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    cursor: isDragging ? 'grabbing' : 'pointer',
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-r-neutral-bg-2"
    >
      {item.disabled ? (
        <Tooltip
          {...(item.commingSoonBadge && { visible: false })}
          title={item.disableReason || t('page.dashboard.home.comingSoon')}
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
          className="panel-item group"
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
          {item.isFullscreen && (
            <div className="absolute top-[6px] right-[6px] opacity-50 text-r-neutral-foot hidden group-hover:block">
              <RcIconExternal1CC />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const DashboardPanel: React.FC<{ onSettingClick?(): void }> = ({
  onSettingClick,
}) => {
  const { t } = useTranslation();
  const history = useHistory();
  usePerpsDefaultAccount({
    isPro: false,
  });
  const { perpsPositionInfo, isFetching, positionPnl } = usePerpsHomePnl();
  // useCheckBridgePendingItem();

  const wallet = useWallet();

  const [badgeModalVisible, setBadgeModalVisible] = useState(false);

  const [isShowEcology, setIsShowEcologyModal] = useState(false);

  const [isShowRabbyPoints, setIsShowRabbyPoints] = useState(false);

  const [isShowDappsPopup, setIsShowDappsPopup] = useState(false);

  const account = useRabbySelector((state) => state.account.currentAccount);
  const dashboardPanelOrder = useRabbySelector(
    (state) => state.preference.dashboardPanelOrder
  );

  const dispatch = useRabbyDispatch();

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
    isFullscreen?: boolean;
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
      onClick: () => {
        history.push('/send-token?rbisource=dashboard');
      },
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
        history.push('/receive?rbisource=dashboard');
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
        // openInternalPageInTab('approval-manage');
        await wallet.openInDesktop('/desktop/profile/approvals');
        window.close();
      },
      badge: approvalRiskAlert,
      badgeAlert: approvalRiskAlert > 0,
      isFullscreen: true,
    } as IPanelItem,
    more: {
      icon: RcIconSettingCC,
      eventKey: 'More',
      content: t('page.dashboard.home.panel.settings'),
      onClick: onSettingClick,
    } as IPanelItem,
    nft: {
      icon: RcIconNftCC,
      eventKey: 'NFT',
      content: t('page.dashboard.home.panel.nft'),
      onClick: async () => {
        // history.push('/nft');
        await wallet.openInDesktop('/desktop/profile/nft');
        window.close();
      },
      isFullscreen: true,
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
      isFullscreen: true,
    } as IPanelItem,
    perps: {
      icon: RcIconPerpsCC,
      eventKey: 'Perps',
      iconClassName: 'icon-perps',
      subContent: isFetching ? (
        <div className="absolute bottom-[6px] text-[11px] font-medium">
          <Skeleton.Button
            active={true}
            className="h-[10px] block rounded-[2px]"
            style={{ width: 42 }}
          />
        </div>
      ) : perpsPositionInfo?.assetPositions?.length ? (
        // <div
        //   className={clsx(
        //     'absolute bottom-[6px] text-[11px] leading-[13px] font-medium text-r-blue-default'
        //   )}
        // >
        //   {t('page.dashboard.home.panel.perpsPositions', {
        //     count: perpsPositionInfo?.assetPositions?.length,
        //   })}
        // </div>
        <div
          className={clsx(
            'absolute bottom-[6px] text-[11px] leading-[13px] font-medium',
            positionPnl && positionPnl > 0
              ? 'text-r-green-default'
              : 'text-r-red-default'
          )}
        >
          {positionPnl && positionPnl >= 0 ? '+' : '-'}$
          {splitNumberByStep(Math.abs(positionPnl || 0).toFixed(2))}
        </div>
      ) : +(perpsPositionInfo?.marginSummary?.accountValue || '') ? (
        <div
          className={clsx(
            'absolute bottom-[6px] text-[11px] leading-[13px] font-medium text-r-neutral-foot'
          )}
        >
          {formatUsdValue(perpsPositionInfo?.marginSummary.accountValue || 0)}
        </div>
      ) : null,
      content: t('page.dashboard.home.panel.perps'),
      onClick: async () => {
        await wallet.openInDesktop('/desktop/perps');
        window.close();
      },
      isFullscreen: true,
    } as IPanelItem,
    searchDapp: {
      icon: RcIconSearchCC,
      eventKey: 'Search Dapp',
      content: t('page.dashboard.home.panel.searchDapp'),
      onClick: () => {
        openInternalPageInTab('dapp-search');
      },
      isFullscreen: true,
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
    prediction: {
      icon: RcIconPrediction,
      eventKey: 'Prediction',
      content: t('page.dashboard.home.panel.prediction'),
      onClick: async () => {
        await wallet.openInDesktop('/desktop/dapp-iframe');
        window.close();
      },
      isFullscreen: true,
    } as IPanelItem,
  };

  const defaultPanelKeys = useMemo<(keyof typeof panelItems)[]>(() => {
    return [
      'swap',
      'send',
      'bridge',
      'receive',
      'transactions',
      'security',
      'perps',
      'prediction',
      'points',
      'mobile',
      'nft',
      'gasAccount',
      'searchDapp',
      'dapps',
      'more',
    ];
  }, []);

  const getPanelKeys = useMemoizedFn(() => {
    const orders = dashboardPanelOrder as (keyof typeof panelItems)[];
    const validKeys = orders.filter(
      (key) => panelItems[key] && defaultPanelKeys.includes(key)
    );
    defaultPanelKeys.forEach((key, index) => {
      if (!validKeys.includes(key)) {
        validKeys.splice(index, 0, key);
      }
    });
    return validKeys;
  });

  const pickedPanelKeys = useMemo(() => {
    return getPanelKeys();
  }, [dashboardPanelOrder]);

  const setPickedPanelKeys = useMemoizedFn(
    (keys: (keyof typeof panelItems)[]) => {
      dispatch.preference.setField({
        dashboardPanelOrder: keys,
      });
      wallet.updateDashboardPanelOrder(keys);
    }
  );

  useMount(() => {
    const panelKeys = getPanelKeys();
    if (!isEqual(dashboardPanelOrder, panelKeys)) {
      setPickedPanelKeys(panelKeys);
    }
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      setActiveId(null);
      return;
    }

    const oldIndex = pickedPanelKeys.findIndex((key) => key === active.id);
    const newIndex = pickedPanelKeys.findIndex((key) => key === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newKeys = [...pickedPanelKeys];
      const [removed] = newKeys.splice(oldIndex, 1);
      newKeys.splice(newIndex, 0, removed);
      console.log('newKeys', newKeys);
      setPickedPanelKeys(newKeys);
    }
    setActiveId(null);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    })
  );

  const [activeId, setActiveId] = useState<string | null>(null);

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const activeItem = useMemo(() => {
    if (!activeId) return null;
    return panelItems[activeId as keyof typeof panelItems] as
      | IPanelItem
      | undefined;
  }, [activeId, panelItems]);

  const ref = useRef<HTMLDivElement | null>(null);
  const scroll = useScroll(ref);
  const scrollRatio = useMemo(() => {
    const top = scroll?.top ?? 0;
    const height = ref.current?.getBoundingClientRect()?.height ?? 0;
    const scrollHeight = ref.current?.scrollHeight ?? 440 + FOOTER_HEIGHT;
    const ratio = top / (scrollHeight - FOOTER_HEIGHT - height);
    return ratio > 1 ? 1 : ratio;
  }, [scroll?.top]);

  const { isDarkTheme } = useThemeMode();

  return (
    <div
      className={clsx(
        'relative px-[16px] pt-[14px] pb-[12px]',
        'rabby-dashboard-panel-container'
      )}
    >
      <GlobalStyle />
      <div
        className="overflow-auto rounded-[8px] bg-r-neutral-card-2"
        style={{
          height: 264,
          overscrollBehavior: 'contain',
          scrollSnapType: 'both mandatory',
        }}
        ref={ref}
      >
        <div
          style={{
            backgroundColor: isDarkTheme ? 'rgb(41,43,57)' : 'unset',
          }}
        >
          <DndContext
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
            measuring={{
              droppable: { strategy: MeasuringStrategy.Always },
            }}
            sensors={sensors}
            collisionDetection={closestCenter}
            autoScroll={{
              threshold: {
                x: 0.2,
                y: 0.2,
              },
              acceleration: 10,
            }}
          >
            <SortableContext items={pickedPanelKeys}>
              <div className="dashboard-panel-grid">
                {pickedPanelKeys.map((panelKey, index) => {
                  const item = panelItems[panelKey] as IPanelItem;
                  return (
                    <SortablePanelItem
                      key={panelKey}
                      panelKey={panelKey}
                      item={item}
                      isGnosis={isGnosis}
                      index={index}
                    />
                  );
                })}
              </div>
            </SortableContext>
            <DragOverlay
              dropAnimation={{
                duration: 200,
                easing: 'ease',
              }}
              style={{
                cursor: 'grabbing',
              }}
            >
              <>
                {activeId && activeItem ? (
                  <div>
                    <div
                      className={clsx(
                        'panel-item group',
                        'rounded-[8px] bg-r-blue-light1',
                        'border border-rabby-blue-default'
                      )}
                      style={{
                        boxShadow: '0 4px 16px 0 rgba(0, 0, 0, 0.13)',
                      }}
                    >
                      {activeItem.showAlert && (
                        <ThemeIcon
                          src={IconAlertRed}
                          className="icon icon-alert"
                        />
                      )}
                      {activeItem.badge ? (
                        <Badge
                          count={activeItem.badge}
                          size="small"
                          className={clsx(
                            {
                              alert:
                                activeItem.badgeAlert &&
                                !activeItem.badgeClassName,
                            },
                            activeItem.badgeClassName
                          )}
                        >
                          <ThemeIcon
                            src={activeItem.icon}
                            className={clsx([
                              activeItem.iconSpin && 'icon-spin',
                              'panel-item-icon',
                            ])}
                          />
                        </Badge>
                      ) : (
                        <ThemeIcon
                          src={activeItem.icon}
                          className={clsx([
                            'panel-item-icon',
                            activeItem.iconClassName,
                          ])}
                        />
                      )}
                      <div className="panel-item-label">
                        {activeItem.content}
                      </div>
                      {activeItem.subContent}
                      {activeItem.commingSoonBadge && (
                        <div className="coming-soon-badge">
                          {t('page.dashboard.home.soon')}
                        </div>
                      )}
                      {activeItem.isFullscreen && (
                        <div className="absolute top-[6px] right-[6px] opacity-50 text-r-neutral-foot hidden group-hover:block">
                          <RcIconExternal1CC />
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </>
            </DragOverlay>
          </DndContext>
          <footer className="dashboard-panel-footer">
            <div
              className={clsx(
                'text-r-neutral-foot',
                'flex items-center justify-center py-[10px] gap-[2px]',
                'sticky bottom-0'
              )}
            >
              <RcIconLampCC />
              <div className="text-[12px] leading-[14px]">
                {t('page.dashboard.home.panel.dragTip')}
              </div>
            </div>
          </footer>
        </div>
      </div>
      <div className="absolute right-[8px] top-[50%] translate-y-[-50%]">
        <div className="w-[3px] h-[80px] rounded-full relative">
          <div
            className="w-[3px] h-[50px] bg-r-blue-default rounded-full relative z-10"
            style={{
              transform: `translateY(${scrollRatio * 30}px)`,
            }}
          ></div>
          <div className="rounded-full absolute top-0 left-0 right-0 bottom-0 bg-r-blue-disable opacity-50"></div>
        </div>
      </div>

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
