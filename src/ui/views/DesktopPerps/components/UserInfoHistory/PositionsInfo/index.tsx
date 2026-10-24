import { MarketData, PositionAndOpenOrder } from '@/ui/state/perps';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { formatUsdValue, sleep, splitNumberByStep } from '@/ui/utils';
import { Button, message, Modal, Table, Tooltip } from 'antd';
import { ColumnType } from 'antd/lib/table';
import clsx from 'clsx';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { CommonTable } from '../CommonTable';
import BigNumber from 'bignumber.js';
import { ReactComponent as RcIconAlarmCC } from '@/ui/assets/perps/icon-alarm-cc.svg';
import {
  calculateDistanceToLiquidation,
  formatPerpsPct,
} from '@/ui/views/Perps/utils';
import { RcIconEditCC } from '@/ui/assets/desktop/common';
import { EditMarginModal } from '../../../modal/EditMarginModal';
import { useMemoizedFn } from 'ahooks';
import { getPerpsSDK } from '@/ui/views/Perps/sdkManager';
import { Trans, useTranslation } from 'react-i18next';
import { usePerpsPosition } from '@/ui/views/Perps/hooks/usePerpsPosition';
import { noop, set } from 'lodash';
import { PerpsBlueBorderedButton } from '@/ui/views/Perps/components/BlueBorderedButton';
import { useThemeMode } from '@/ui/hooks/usePreference';
import * as Sentry from '@sentry/browser';
import { ClosePositionModal } from '../../../modal/ClosePositionModal';
import { PositionTpSlModal } from '../../../modal/PositionTpSlModal';
import {
  PositionTpSlOrder,
  TpSlKind,
  TpSlScope,
  collectPositionTpSlOrders,
  findNearestTpSlOrder,
} from '../../../positionTpSl';
import { DistanceRiskTag } from './DistanceRiskTag';
import { InlineLimitClose } from './InlineLimitClose';
import { usePerpsProPosition } from '../../../hooks/usePerpsProPosition';
import { LeverageModal } from '../../TradingPanel/components';
import { MarginMode } from '../../../types';
import { OpenOrder } from '@rabby-wallet/hyperliquid-sdk';
import { ReactComponent as RcIconCloseAllWarning } from '@/ui/assets/perps/IconCloseAllWarning.svg';
import { DashedUnderlineText } from '../../DashedUnderlineText';
import {
  getStatsReportSide,
  handleDisplayFundingPayments,
  isScreenSmall,
} from '../../../utils';
import { formatPerpsCoin } from '../../../utils';
import { PerpsDisplayCoinName } from '@/ui/views/Perps/components/PerpsDisplayCoinName';
import { PerpsQuoteAsset } from '@/ui/views/Perps/constants';
import perpsToast from '../../PerpsToast';
import { ga4 } from '@/utils/ga4';
import stats from '@/stats';
import { usePerpsAccount } from '@/ui/views/Perps/hooks/usePerpsAccount';

export interface PositionFormatData {
  direction: 'Long' | 'Short';
  type: 'cross' | 'isolated';
  coin: string;
  quoteAsset: string;
  size: string;
  positionValue: string;
  leverage: number;
  maxLeverage: number;
  markPx: string;
  entryPx: string;
  liquidationPx: string;
  marginUsed: string;
  unrealizedPnl: string;
  returnOnEquity: string;
  liquidationDistancePercent: string;
  sinceOpenFunding: string;
  /** TP/SL orders attached to this position, both scopes. */
  tpslOrders: PositionTpSlOrder[];
  closeLimitOrders: OpenOrder[];
}

export const PositionsInfo: React.FC = () => {
  const {
    clearinghouseState,
    openOrders,

    marketDataMap,
    currentPerpsAccount,
    wsActiveAssetCtx,
  } = useRabbySelector((store) => store.perps);
  const dispatch = useRabbyDispatch();
  const { t } = useTranslation();

  const { getAvailableByAsset } = usePerpsAccount();

  const [editMarginVisible, setEditMarginVisible] = useState(false);
  const [editTpSlVisible, setEditTpSlVisible] = useState(false);
  const [tpSlTab, setTpSlTab] = useState<TpSlScope>('partial');
  // Bumped on every open so the modal content always mounts fresh, even when
  // reopened during the previous close animation.
  const [tpSlOpenCount, setTpSlOpenCount] = useState(0);
  const [closePositionVisible, setClosePositionVisible] = useState(false);
  const [closePositionType, setClosePositionType] = useState<
    'limit' | 'market' | 'reverse'
  >('market');

  const [showLeverageModal, setShowLeverageModal] = React.useState(false);

  const positionFormatData = useMemo(() => {
    const resArr = [] as PositionFormatData[];

    clearinghouseState?.assetPositions.forEach((item) => {
      const isLong = Number(item.position.szi || 0) > 0;
      const marketData = marketDataMap[item.position.coin] || {};

      const closeLimitOrders = openOrders.filter(
        (order) =>
          order.coin === item.position.coin &&
          order.reduceOnly &&
          !order.isTrigger
        // order.orderType === 'Limit'
      );

      const pxDecimals = marketData.pxDecimals ?? 2;
      const quoteAsset = marketData.quoteAsset || 'USDC';

      const liquidationDistance = calculateDistanceToLiquidation(
        item.position.liquidationPx,
        marketData.markPx
      );

      resArr.push({
        direction: isLong ? 'Long' : 'Short',
        type: item.position.leverage.type,
        coin: item.position.coin,
        size: isLong ? item.position.szi : item.position.szi.slice(1),
        leverage: item.position.leverage.value,
        maxLeverage: marketData.maxLeverage || 25,
        positionValue: item.position.positionValue,
        quoteAsset,
        markPx: Number(marketData.markPx || 0).toFixed(pxDecimals),
        entryPx: Number(item.position.entryPx || 0).toFixed(pxDecimals),
        liquidationPx:
          Number(item.position.liquidationPx || 0).toFixed(pxDecimals) || '0',
        marginUsed: item.position.marginUsed || '0',
        unrealizedPnl: item.position.unrealizedPnl,
        returnOnEquity: item.position.returnOnEquity,
        liquidationDistancePercent: formatPerpsPct(liquidationDistance),
        sinceOpenFunding: item.position.cumFunding.sinceOpen || '0',
        tpslOrders: collectPositionTpSlOrders(openOrders, {
          coin: item.position.coin,
          direction: isLong ? 'Long' : 'Short',
        }),
        closeLimitOrders,
      });
    });

    return resArr;
  }, [clearinghouseState, openOrders, marketDataMap]);

  const existPosition = useMemo(() => {
    return (
      clearinghouseState?.assetPositions?.length &&
      clearinghouseState.assetPositions.length > 0
    );
  }, [clearinghouseState?.assetPositions?.length]);

  useEffect(() => {
    if (existPosition) {
      ga4.fireEvent('Perps_ExistPosition_Web', {
        event_category: 'Rabby Perps',
      });
    }
  }, [existPosition]);

  const isSmallScreen = isScreenSmall();

  const [selectedCoin, setSelectedCoin] = useState<string>('');
  const currentPosition = useMemo(() => {
    return (
      positionFormatData.find((item) => item.coin === selectedCoin) || null
    );
  }, [positionFormatData, selectedCoin]);

  // The modal unmounts with its position; don't leave it armed to reappear.
  useEffect(() => {
    if (!currentPosition) setEditTpSlVisible(false);
  }, [currentPosition]);

  const closeAllModalRef = useRef<{ destroy: () => void } | null>(null);

  // Switching address: these modals act on the previous account's positions
  // (Close All would even close the new account's).
  useEffect(() => {
    setEditTpSlVisible(false);
    setEditMarginVisible(false);
    setClosePositionVisible(false);
    setShowLeverageModal(false);
    closeAllModalRef.current?.destroy();
    closeAllModalRef.current = null;
  }, [currentPerpsAccount?.address]);

  const {
    handleUpdateMargin,
    handleCloseAllPositions,
    handleUpdateMarginModeLeverage,
  } = usePerpsProPosition();

  const { isDarkTheme } = useThemeMode();

  const handleCloseAllPosition = useMemoizedFn(async () => {
    if (!clearinghouseState) {
      return;
    }

    await handleCloseAllPositions(clearinghouseState);
    clearinghouseState.assetPositions.forEach((item) => {
      const isBuy = Number(item.position.szi || 0) > 0;
      const price = new BigNumber(item.position.positionValue || 0).div(
        new BigNumber(item.position.szi || 1).abs()
      );
      stats.report('perpsTradeHistory', {
        created_at: new Date().getTime(),
        user_addr: currentPerpsAccount?.address || '',
        trade_type: 'close all market',
        leverage: item.position.leverage.value.toString(),
        trade_side: getStatsReportSide(isBuy, true),
        margin_mode:
          item.position.leverage.type === 'cross' ? 'cross' : 'isolated',
        coin: item.position.coin,
        size: Math.abs(Number(item.position.szi || 0)),
        price: price.toFixed(2),
        trade_usd_value: item.position.positionValue,
        service_provider: 'hyperliquid',
        app_version: process.env.release || '0',
        address_type: currentPerpsAccount?.type || '',
      });
    });
  });

  const handleClickLeverage = useMemoizedFn(
    (coin: string, leverage: number) => {
      setSelectedCoin(coin);
      setShowLeverageModal(true);
    }
  );

  const handleLeverageConfirm = useMemoizedFn(async (newLeverage: number) => {
    const marginMode =
      currentPosition?.type === 'cross'
        ? MarginMode.CROSS
        : MarginMode.ISOLATED;
    const res = await handleUpdateMarginModeLeverage(
      selectedCoin,
      newLeverage,
      marginMode,
      'leverage'
    );
    res &&
      perpsToast.success({
        title: t('page.perps.toast.success'),
        description: t('page.perps.toast.leverageChanged', {
          leverage: newLeverage,
        }),
      });
    setShowLeverageModal(false);
  });

  const handleClickCloseAll = useMemoizedFn(async () => {
    const modal = Modal.info({
      width: 400,
      closable: false,
      maskClosable: true,
      centered: true,
      title: null,
      icon: null,
      className: clsx(
        'perps-bridge-swap-modal perps-close-all-position-modal',
        isDarkTheme
          ? 'perps-bridge-swap-modal-dark'
          : 'perps-bridge-swap-modal-light'
      ),
      content: (
        <div className="flex items-center justify-center flex-col">
          <RcIconCloseAllWarning />
          <div className="text-[16px] mt-20 mb-12 font-medium text-r-neutral-title-1 text-center">
            {t('page.perpsPro.userInfo.positionInfo.confirmCloseAllTitle')}
          </div>
          <div className="text-13 text-rb-neutral-foot text-center">
            {t('page.perpsPro.userInfo.positionInfo.confirmCloseAllDesc')}
          </div>
          <div className="flex items-center justify-center w-full gap-12 mt-[48px]">
            <PerpsBlueBorderedButton
              block
              onClick={() => {
                modal.destroy();
              }}
            >
              {t('page.manageAddress.cancel')}
            </PerpsBlueBorderedButton>
            <Button
              size="large"
              block
              type="primary"
              onClick={async () => {
                handleCloseAllPosition();
                modal.destroy();
              }}
            >
              {t('page.manageAddress.confirm')}
            </Button>
          </div>
        </div>
      ),
    });
    closeAllModalRef.current = modal;
  });

  const openTpSlModal = useMemoizedFn((coin: string, tab: TpSlScope) => {
    setSelectedCoin(coin);
    setTpSlTab(tab);
    setTpSlOpenCount((n) => n + 1);
    setEditTpSlVisible(true);
  });

  // The order of a side to show in the table: nearest to the mark price.
  const pickTpSlOrder = (
    orders: PositionTpSlOrder[],
    kind: TpSlKind,
    markPx: string
  ) => {
    const ofKind = orders.filter((order) => order.kind === kind);
    return findNearestTpSlOrder(ofKind, markPx) ?? ofKind[0] ?? null;
  };

  const renderTpSlAdd = (coin: string, tab: TpSlScope) => (
    <div className="flex items-center">
      <button
        type="button"
        className={clsx(
          'bg-rb-neutral-bg-5 rounded-[3px] px-12 h-24',
          'border border-transparent',
          'hover:border-rb-brand-default',
          'text-12 text-r-neutral-title-1'
        )}
        onClick={(e) => {
          e.stopPropagation();
          openTpSlModal(coin, tab);
        }}
      >
        {t('page.perpsPro.positionTpSl.add')}
      </button>
    </div>
  );

  const renderTpSlPrices = (
    tp: PositionTpSlOrder | null,
    sl: PositionTpSlOrder | null
  ) => (
    <div className="flex flex-col gap-[4px] text-[12px] leading-[14px]">
      {tp ? (
        <span className="text-rb-green-default">
          {`$${splitNumberByStep(tp.triggerPrice)}`}
        </span>
      ) : (
        <span className="text-rb-neutral-foot">
          {t('page.perpsPro.positionTpSl.noTp')}
        </span>
      )}
      {sl ? (
        <span className="text-rb-red-default">
          {`$${splitNumberByStep(sl.triggerPrice)}`}
        </span>
      ) : (
        <span className="text-rb-neutral-foot">
          {t('page.perpsPro.positionTpSl.noSl')}
        </span>
      )}
    </div>
  );

  const renderTpSlEdit = (coin: string, tab: TpSlScope) => (
    <RcIconEditCC
      className="h-[16px] w-[16px] shrink-0 text-rb-neutral-foot cursor-pointer hover:text-r-blue-default"
      onClick={(e) => {
        e.stopPropagation();
        openTpSlModal(coin, tab);
      }}
    />
  );

  const columns = useMemo<ColumnType<PositionFormatData>[]>(
    () => [
      {
        title: t('page.perpsPro.userInfo.tab.coin'),
        className: 'relative',
        key: 'coin',
        width: 172,
        dataIndex: 'coin',
        sorter: (a, b) => a.coin.localeCompare(b.coin),
        render: (_, record) => {
          return (
            <div
              className={clsx(
                'absolute top-0 left-0 right-0 bottom-0',
                'flex flex-col justify-center',
                'pl-[12px] py-[8px]',
                record.direction === 'Long' ? 'is-long-bg' : 'is-short-bg'
              )}
            >
              <div>
                <div className="group text-[13px] leading-[16px] text-r-neutral-title-1 mb-[2px]">
                  <PerpsDisplayCoinName
                    item={
                      marketDataMap[record.coin] || {
                        name: record.coin,
                        quoteAsset: record.quoteAsset as PerpsQuoteAsset,
                      }
                    }
                    separator="-"
                    showDexTag
                    baseClassName="group-hover:text-rb-brand-default group-hover:font-bold"
                    quoteClassName="text-r-neutral-title-1 group-hover:text-rb-brand-default group-hover:font-bold"
                  />
                </div>
                <div
                  className={clsx(
                    'text-[12px] leading-[14px]',
                    record.direction === 'Long'
                      ? 'text-rb-green-default'
                      : 'text-rb-red-default'
                  )}
                >
                  <span
                    className={clsx(
                      'text-[12px] leading-[14px] hover:font-bold hover:text-rb-brand-default cursor-pointer'
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClickLeverage(record.coin, record.leverage);
                    }}
                  >
                    {record.leverage}x{' '}
                  </span>
                  {record.direction === 'Long' ? 'Long' : 'Short'}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        title: t('page.perpsPro.userInfo.tab.size'),
        key: 'positionValue',
        width: 108,
        dataIndex: 'positionValue',
        sorter: (a, b) => Number(a.positionValue) - Number(b.positionValue),
        render: (_, record) => {
          return (
            <div>
              <div className="text-[12px] leading-[14px]  text-r-neutral-body mb-[4px]">
                {formatUsdValue(record.positionValue || 0)}
              </div>
              <div className="text-[12px] leading-[14px]  text-rb-neutral-secondary">
                {Number(record.size)} {formatPerpsCoin(record.coin)}
              </div>
            </div>
          );
        },
      },
      {
        title: t('page.perpsPro.userInfo.tab.markEntry'),
        key: 'entryPx',
        width: 88,
        dataIndex: 'entryPx',
        sorter: (a, b) => Number(a.entryPx) - Number(b.entryPx),
        render: (_, record) => {
          return (
            <div>
              <div className="text-[12px] leading-[14px]  text-r-neutral-body mb-[4px]">
                ${splitNumberByStep(record.markPx)}
              </div>
              <div className="text-[12px] leading-[14px]  text-rb-neutral-secondary">
                ${splitNumberByStep(record.entryPx || 0)}
              </div>
            </div>
          );
        },
      },
      {
        title: t('page.perpsPro.userInfo.tab.liqPrice'),
        key: 'liquidationPx',
        width: 92,
        dataIndex: 'liquidationPx',
        sorter: (a, b) => Number(a.liquidationPx) - Number(b.liquidationPx),
        render: (_, record) => {
          return (
            <div className="flex items-center gap-[4px]">
              {new BigNumber(record.liquidationPx).gt(0) ? (
                <Tooltip
                  overlayClassName="rectangle"
                  title={
                    record.direction === 'Long'
                      ? t('page.perpsPro.userInfo.distanceRiskTag.goingDown', {
                          percent: record.liquidationDistancePercent,
                        })
                      : t('page.perpsPro.userInfo.distanceRiskTag.goingUp', {
                          percent: record.liquidationDistancePercent,
                        })
                  }
                >
                  <div className="text-[12px] leading-[14px]  text-rb-orange-default">
                    ${splitNumberByStep(record.liquidationPx)}
                  </div>
                </Tooltip>
              ) : (
                <div className="text-[12px] leading-[14px]  text-r-neutral-body">
                  -
                </div>
              )}
            </div>
          );
        },
      },
      {
        title: t('page.perpsPro.userInfo.tab.margin'),
        key: 'marginUsed',
        width: 108,
        dataIndex: 'marginUsed',
        sorter: (a, b) => Number(a.marginUsed) - Number(b.marginUsed),
        render: (_, record) => {
          return (
            <div className="flex items-center gap-[12px]">
              <div>
                <div className="text-[12px] leading-[14px]  text-r-neutral-body mb-[4px]">
                  {formatUsdValue(Number(record.marginUsed || 0))}
                </div>
                <div className="text-[12px] leading-[14px]  text-rb-neutral-secondary">
                  {record.type === 'cross' ? 'Cross' : 'Isolated'}
                </div>
              </div>
              {record.type === 'isolated' && (
                <RcIconEditCC
                  className="text-rb-neutral-foot cursor-pointer hover:text-r-blue-default"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCoin(record.coin);
                    setEditMarginVisible(true);
                  }}
                />
              )}
            </div>
          );
        },
      },
      {
        title: (
          <DashedUnderlineText
            tooltipText={t('page.perpsPro.userInfo.tab.unrealizedPnlTooltip')}
          >
            {t('page.perpsPro.userInfo.tab.unrealizedPnl')}
          </DashedUnderlineText>
        ),
        width: 92,
        key: 'unrealizedPnl',
        dataIndex: 'unrealizedPnl',
        sorter: (a, b) => Number(a.unrealizedPnl) - Number(b.unrealizedPnl),
        render: (_, record) => {
          const isUp = Number(record.unrealizedPnl) >= 0;
          return (
            <div>
              <div
                className={clsx(
                  'text-[12px] leading-[14px]   mb-[4px]',
                  isUp ? 'text-r-green-default' : 'text-r-red-default'
                )}
              >
                {isUp ? '+' : '-'}$
                {splitNumberByStep(
                  Math.abs(Number(record.unrealizedPnl)).toFixed(2)
                )}{' '}
              </div>
              <div
                className={clsx(
                  'text-[12px] leading-[14px]   mb-[4px]',
                  isUp ? 'text-r-green-default' : 'text-r-red-default'
                )}
              >
                {isUp ? '+' : '-'}
                {Math.abs(Number(record.returnOnEquity) * 100).toFixed(2)}%
              </div>
            </div>
          );
        },
      },
      {
        title: (
          <DashedUnderlineText
            tooltipText={() => (
              <Trans
                i18nKey={'page.perpsPro.userInfo.tab.fundingTipsBold'}
                components={{
                  bold: <span className="font-bold" />,
                }}
              />
            )}
          >
            {t('page.perpsPro.userInfo.tab.funding')}
          </DashedUnderlineText>
        ),
        key: 'fundingPayments',
        width: 72,
        dataIndex: 'fundingPayments',
        sorter: (a, b) =>
          Number(a.sinceOpenFunding) - Number(b.sinceOpenFunding),
        render: (_, record) => {
          const isGain = Number(record.sinceOpenFunding) < 0;
          return (
            <div
              className={clsx(
                'text-[12px] leading-[14px]  text-rb-neutral-foot',
                isGain ? 'text-rb-green-default' : 'text-rb-red-default'
              )}
            >
              {handleDisplayFundingPayments(record.sinceOpenFunding)}
            </div>
          );
        },
      },
      {
        title: (
          <div className="flex">
            <div
              className="text-rb-brand-default cursor-pointer text-[12px] hover:text-r-neutral-title-1 transition-colors whitespace-nowrap"
              onClick={handleClickCloseAll}
            >
              MKT Close ALL
            </div>
          </div>
        ),
        key: 'closeAction',
        width: 262,
        dataIndex: 'closeAction',
        render: (_, record) => {
          return (
            <InlineLimitClose
              record={record}
              marketData={marketDataMap[record.coin] || ({} as any)}
            />
          );
        },
      },
      {
        title: t('page.perpsPro.userInfo.positionInfo.reverse'),
        key: 'reverse',
        dataIndex: 'reverse',
        width: 94,
        render: (_, record) => {
          return (
            <div className="flex">
              <button
                type="button"
                className={clsx(
                  'bg-rb-neutral-bg-5 rounded-[3px] px-12 h-24',
                  'border border-transparent',
                  'hover:border-rb-brand-default',
                  'text-12 text-r-neutral-title-1'
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedCoin(record.coin);
                  setClosePositionType('reverse');
                  setClosePositionVisible(true);
                }}
              >
                {t('page.perpsPro.userInfo.positionInfo.reverse')}
              </button>
            </div>
          );
        },
      },
      {
        title: (
          <DashedUnderlineText
            tooltipText={t('page.perpsPro.positionTpSl.introPositionDesc')}
          >
            {t('page.perpsPro.positionTpSl.tabPosition')}
          </DashedUnderlineText>
        ),
        key: 'positionTpSl',
        dataIndex: 'positionTpSl',
        width: 120,
        render: (_, record) => {
          const orders = record.tpslOrders.filter(
            (order) => order.scope === 'position'
          );
          if (!orders.length) return renderTpSlAdd(record.coin, 'position');
          const markPx = marketDataMap[record.coin]?.markPx || record.markPx;
          return (
            <div className="flex items-center gap-[12px]">
              {renderTpSlPrices(
                pickTpSlOrder(orders, 'takeProfit', markPx),
                pickTpSlOrder(orders, 'stopLoss', markPx)
              )}
              {renderTpSlEdit(record.coin, 'position')}
            </div>
          );
        },
      },
      {
        title: (
          <DashedUnderlineText
            tooltipText={t('page.perpsPro.positionTpSl.introPartialDesc')}
          >
            {t('page.perpsPro.positionTpSl.tabPartial')}
          </DashedUnderlineText>
        ),
        key: 'partialTpSl',
        dataIndex: 'partialTpSl',
        width: 138,
        render: (_, record) => {
          const orders = record.tpslOrders.filter(
            (order) => order.scope === 'partial'
          );
          if (!orders.length) return renderTpSlAdd(record.coin, 'partial');
          const markPx = marketDataMap[record.coin]?.markPx || record.markPx;
          // The cell shows one order per side; show the total only when a side
          // has more orders than that, i.e. some are not visible here.
          const hasHiddenOrders = (['takeProfit', 'stopLoss'] as const).some(
            (kind) => orders.filter((order) => order.kind === kind).length > 1
          );
          return (
            <div className="flex items-center gap-[12px]">
              <div className="flex items-center gap-[6px]">
                {renderTpSlPrices(
                  pickTpSlOrder(orders, 'takeProfit', markPx),
                  pickTpSlOrder(orders, 'stopLoss', markPx)
                )}
                {hasHiddenOrders ? (
                  <span className="text-[12px] leading-[14px] text-rb-neutral-foot">
                    ({orders.length})
                  </span>
                ) : null}
              </div>
              {renderTpSlEdit(record.coin, 'partial')}
            </div>
          );
        },
      },
    ],
    [marketDataMap, isSmallScreen, t]
  );

  return (
    <>
      <CommonTable
        emptyMessage={t('page.perpsPro.userInfo.emptyMessage.positions')}
        dataSource={positionFormatData}
        columns={columns}
        pagination={false}
        bordered={false}
        showSorterTooltip={false}
        rowKey="coin"
        defaultSortField="coin"
        defaultSortOrder="ascend"
        onRow={(record) => ({
          onClick: () => dispatch.perps.setSelectedCoin(record.coin),
          style: { cursor: 'pointer' },
        })}
      ></CommonTable>
      {currentPosition && (
        <>
          <EditMarginModal
            visible={editMarginVisible}
            coin={currentPosition?.coin || ''}
            currentAssetCtx={marketDataMap[currentPosition.coin] || {}}
            direction={currentPosition.direction}
            entryPrice={Number(currentPosition.entryPx || 0)}
            leverage={currentPosition.leverage}
            availableBalance={getAvailableByAsset(
              currentPosition.quoteAsset as PerpsQuoteAsset
            )}
            liquidationPx={Number(currentPosition?.liquidationPx || 0)}
            positionSize={Number(currentPosition.size || 0)}
            marginUsed={Number(currentPosition.marginUsed || 0)}
            pnl={Number(currentPosition.unrealizedPnl || 0)}
            onCancel={() => setEditMarginVisible(false)}
            onConfirm={async (action: 'add' | 'reduce', margin: number) => {
              await handleUpdateMargin(
                currentPosition.coin,
                marketDataMap[currentPosition.coin]?.dexId ?? '',
                action,
                margin
              );
              setEditMarginVisible(false);
            }}
          />
          <PositionTpSlModal
            key={tpSlOpenCount}
            visible={editTpSlVisible}
            position={currentPosition}
            marketData={marketDataMap[currentPosition.coin] || {}}
            defaultTab={tpSlTab}
            onClose={() => setEditTpSlVisible(false)}
          />
          <ClosePositionModal
            type={closePositionType}
            position={currentPosition}
            marketData={marketDataMap[currentPosition.coin] || {}}
            visible={closePositionVisible}
            onCancel={() => setClosePositionVisible(false)}
            onConfirm={() => {
              setClosePositionVisible(false);
            }}
          />
          {/* Leverage Modal */}
          <LeverageModal
            visible={showLeverageModal}
            currentLeverage={currentPosition?.leverage || 1}
            maxLeverage={currentPosition?.maxLeverage || 25}
            coinSymbol={currentPosition?.coin || ''}
            onConfirm={handleLeverageConfirm}
            onCancel={() => setShowLeverageModal(false)}
          />
        </>
      )}
    </>
  );
};
