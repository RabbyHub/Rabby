import React, { useEffect, useMemo } from 'react';
import { PageHeader } from '@/ui/component';
import { useParams, useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatUsdValue } from '@/ui/utils';
import { Button, Switch } from 'antd';
import clsx from 'clsx';
import { usePerpsState } from '../usePerpsState';
import Chart from './Chart';
import { CANDLE_MENU_KEY } from '../constants';
import { getPerpsSDK } from '../sdkManager';
import { useMemoizedFn } from 'ahooks';
import { WsActiveAssetCtx } from '@rabby-wallet/hyperliquid-sdk';
import { formatUsdValueKMB } from '../../Dashboard/components/TokenDetailPopup/utils';
import { useRabbySelector } from '@/ui/store';
import { PerpsOpenPositionPopup } from './OpenPositionPopup';
import { ClosePositionPopup } from './ClosePositionPopup';
import BigNumber from 'bignumber.js';
import { usePerpsPosition } from '../usePerpsPosition';

export const formatPercent = (value: number) => {
  return `${value * 100}%`;
};

export const PerpsSingleCoin = () => {
  const { coin } = useParams<{ coin: string }>();
  const history = useHistory();
  const { t } = useTranslation();
  const {
    positionAndOpenOrders,
    accountSummary,
    marketDataMap,
    perpFee,
  } = useRabbySelector((state) => state.perps);
  const [
    selectedInterval,
    setSelectedInterval,
  ] = React.useState<CANDLE_MENU_KEY>(CANDLE_MENU_KEY.ONE_DAY);

  const { handleOpenPosition, handleClosePosition } = usePerpsPosition();
  usePerpsState();

  const [activeAssetCtx, setActiveAssetCtx] = React.useState<
    WsActiveAssetCtx['ctx'] | null
  >(null);

  const [openPositionVisible, setOpenPositionVisible] = React.useState(false);
  const [positionDirection, setPositionDirection] = React.useState<
    'Long' | 'Short'
  >('Long');
  const [closePositionVisible, setClosePositionVisible] = React.useState(false);

  // 查找当前币种的仓位信息
  const currentPosition = useMemo(() => {
    return positionAndOpenOrders?.find(
      (asset) => asset.position.coin.toLowerCase() === coin?.toLowerCase()
    );
  }, [positionAndOpenOrders, coin]);

  const providerFee = React.useMemo(() => {
    return perpFee;
  }, [perpFee]);

  const currentAssetCtx = useMemo(() => {
    return marketDataMap[coin.toUpperCase()];
  }, [marketDataMap, coin]);

  console.log('currentPosition', currentPosition);
  const { tpPrice, slPrice } = useMemo(() => {
    if (
      !currentPosition ||
      !currentPosition.openOrders ||
      !currentPosition.openOrders.length
    ) {
      return {
        tpPrice: undefined,
        slPrice: undefined,
      };
    }

    const tpItem = currentPosition.openOrders.find(
      (order) =>
        order.orderType === 'Take Profit Market' &&
        order.isTrigger &&
        order.reduceOnly
    );

    const slItem = currentPosition.openOrders.find(
      (order) =>
        order.orderType === 'Stop Market' && order.isTrigger && order.reduceOnly
    );

    return {
      tpPrice: tpItem?.triggerPx,
      slPrice: slItem?.triggerPx,
    };
  }, [currentPosition]);

  const hasPosition = !!currentPosition;

  const CANDLE_MENU_ITEM = useMemo(
    () => [
      {
        label: t('page.perps.candleMenuKey.oneHour'),
        key: CANDLE_MENU_KEY.ONE_HOUR,
      },
      {
        label: t('page.perps.candleMenuKey.oneDay'),
        key: CANDLE_MENU_KEY.ONE_DAY,
      },
      {
        label: t('page.perps.candleMenuKey.oneWeek'),
        key: CANDLE_MENU_KEY.ONE_WEEK,
      },
      {
        label: t('page.perps.candleMenuKey.oneMonth'),
        key: CANDLE_MENU_KEY.ONE_MONTH,
      },
      {
        label: t('page.perps.candleMenuKey.ytd'),
        key: CANDLE_MENU_KEY.YTD,
      },
      {
        label: t('page.perps.candleMenuKey.all'),
        key: CANDLE_MENU_KEY.ALL,
      },
    ],
    [t]
  );

  const subscribeActiveAssetCtx = useMemoizedFn(() => {
    const sdk = getPerpsSDK();
    const { unsubscribe } = sdk.ws.subscribeToActiveAssetCtx(coin, (data) => {
      setActiveAssetCtx(data.ctx);
      console.log('activeAssetCtx', data.ctx);
    });

    return () => {
      unsubscribe();
    };
  });

  // Subscribe to real-time candle updates
  useEffect(() => {
    const unsubscribe = subscribeActiveAssetCtx();

    return () => {
      // Cleanup WebSocket subscription
      unsubscribe?.();
    };
  }, [subscribeActiveAssetCtx]);

  // Available balance for trading
  const availableBalance = Number(accountSummary?.withdrawable || 0);

  const markPrice = useMemo(() => {
    return Number(activeAssetCtx?.markPx || currentAssetCtx?.markPx || 0);
  }, [activeAssetCtx]);
  const dayDelta = useMemo(() => {
    const prevDayPx = Number(
      activeAssetCtx?.prevDayPx || currentAssetCtx?.prevDayPx || 0
    );
    return markPrice - prevDayPx;
  }, [activeAssetCtx, markPrice, currentAssetCtx]);
  const isPositiveChange = useMemo(() => {
    return dayDelta >= 0;
  }, [dayDelta]);

  const dayDeltaPercent = useMemo(() => {
    const prevDayPx = Number(
      activeAssetCtx?.prevDayPx || currentAssetCtx?.prevDayPx || 0
    );
    return (dayDelta / prevDayPx) * 100;
  }, [activeAssetCtx, currentAssetCtx, dayDelta]);

  // Position data if exists
  const positionData = currentPosition
    ? {
        pnl: Number(currentPosition.position.unrealizedPnl || 0),
        positionValue: Number(currentPosition.position.positionValue || 0),
        size: Number(currentPosition.position.szi || 0),
        marginUsed: Number(currentPosition.position.marginUsed || 0),
        side: Number(currentPosition.position.szi || 0) > 0 ? 'Long' : 'Short',
        leverage: Number(currentPosition.position.leverage.value || 1),
        entryPrice: Number(currentPosition.position.entryPx || 0),
        liquidationPrice: Number(
          currentPosition.position.liquidationPx || 0
        ).toFixed(currentAssetCtx?.pxDecimals || 2),
        autoClose: false, // This would come from SDK
        direction:
          Number(currentPosition.position.szi || 0) > 0 ? 'Long' : 'Short',
        pnlPercent: Number(currentPosition.position.returnOnEquity || 0) * 100,
        fundingPayments: Number(
          currentPosition.position.cumFunding.sinceOpen || 0
        ),
      }
    : null;

  const hasAutoClose = useMemo(() => {
    return Boolean(tpPrice || slPrice);
  }, [tpPrice, slPrice]);

  const handleAutoCloseSwitch = useMemoizedFn((e: boolean) => {
    console.log('handleAutoClose', e);
  });

  return (
    <div className="h-full min-h-full bg-r-neutral-bg2 flex flex-col">
      <PageHeader className="mx-[20px] pt-[20px] mb-[20px]" forceShowBack>
        {coin}-USD
      </PageHeader>

      <div className="flex-1 overflow-auto mx-20 pb-[80px]">
        {/* Price Chart Section */}
        <div className={clsx('bg-r-neutral-card1 rounded-[12px] p-16 mb-20')}>
          {/* Price Display */}
          <div className="text-center mb-8">
            <div className="text-[32px] font-bold text-r-neutral-title-1">
              ${markPrice}
            </div>
            <div
              className={clsx(
                'text-14 font-medium',
                isPositiveChange ? 'text-r-green-default' : 'text-r-red-default'
              )}
            >
              {isPositiveChange ? '+' : ''}
              {dayDelta} ({isPositiveChange ? '+' : ''}
              {dayDeltaPercent.toFixed(2)}%)
            </div>
          </div>

          {/* TradingView Chart */}
          <div className="h-[160px]">
            <Chart coin={coin} candleMenuKey={selectedInterval} />
          </div>

          {/* Time Range Selector */}
          <div className="flex justify-center gap-12 mt-10">
            {CANDLE_MENU_ITEM.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setSelectedInterval(key)}
                className={clsx(
                  'px-12 py-4 text-12 rounded-[4px]',
                  key === selectedInterval
                    ? 'bg-r-blue-default text-white'
                    : 'text-r-neutral-body hover:bg-r-neutral-bg3'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Available to Trade */}
        {!hasPosition && (
          <div className="flex justify-between items-center text-15 text-r-neutral-title-1 font-medium pt-12 bg-r-neutral-card1 rounded-[12px] p-16">
            <span>
              {t('page.perps.availableToTrade')}:{' '}
              {formatUsdValue(availableBalance, BigNumber.ROUND_DOWN)}
            </span>
            <div className="text-r-blue-default text-13 cursor-pointer px-16 py-10 rounded-[8px] bg-r-blue-light-1">
              {t('page.perps.deposit')}
            </div>
          </div>
        )}

        {hasPosition && (
          <>
            <div className="text-15 font-medium text-r-neutral-title-1 mt-16 mb-8">
              {t('page.perps.yourPosition')}
            </div>
            <div className="bg-r-neutral-card1 rounded-[12px] px-16">
              <div className="flex justify-between text-13 py-16">
                <span className="text-r-neutral-body">
                  {t('page.perps.pnl')}
                </span>
                <span
                  className={clsx(
                    'font-medium',
                    positionData && positionData.pnl >= 0
                      ? 'text-r-green-default'
                      : 'text-r-red-default'
                  )}
                >
                  {positionData && positionData.pnl >= 0 ? '+' : ''}$
                  {Math.abs(positionData?.pnl || 0).toFixed(2)} (
                  {positionData && positionData.pnl >= 0 ? '+' : ''}
                  {positionData?.pnlPercent.toFixed(2)}%)
                </span>
              </div>

              <div className="flex justify-between text-13 py-16">
                <span className="text-r-neutral-body">
                  {t('page.perps.size')}
                </span>
                <span className="text-r-neutral-title-1 font-medium">
                  ${positionData?.positionValue} ={positionData?.size} {coin}
                </span>
              </div>

              <div className="flex justify-between text-13 py-16">
                <span className="text-r-neutral-body">
                  {t('page.perps.marginIsolated')}
                </span>
                <span className="text-r-neutral-title-1 font-medium">
                  {formatUsdValue(
                    positionData!.marginUsed,
                    BigNumber.ROUND_DOWN
                  )}
                </span>
              </div>

              <div className="flex justify-between text-13 py-16">
                <span className="text-r-neutral-body">
                  {t('page.perps.direction')}
                </span>
                <span className="text-r-neutral-title-1 font-medium">
                  {positionData?.direction} {positionData?.leverage}x
                </span>
              </div>

              <div className="flex justify-between text-13 py-16">
                <span className="text-r-neutral-body">
                  {t('page.perps.entryPrice')}
                </span>
                <span className="text-r-neutral-title-1 font-medium">
                  ${positionData?.entryPrice}
                </span>
              </div>

              <div className="flex justify-between text-13 py-16">
                <div className="text-r-neutral-body">
                  <div className="text-13 font-medium text-r-neutral-title-1">
                    {t('page.perps.autoClose')}
                  </div>
                  {hasAutoClose && (
                    <div className="text-r-neutral-title-1 font-medium">
                      ${tpPrice} / ${slPrice}
                    </div>
                  )}
                </div>
                <Switch
                  checked={hasAutoClose}
                  onChange={handleAutoCloseSwitch}
                />
              </div>

              <div className="flex justify-between text-13 py-16">
                <span className="text-r-neutral-body">
                  {t('page.perps.liquidationPrice')}
                </span>
                <span className="text-r-neutral-title-1 font-medium">
                  ${positionData?.liquidationPrice}
                </span>
              </div>

              <div className="flex justify-between text-13 py-16">
                <span className="text-r-neutral-body">
                  {t('page.perps.fundingPayments')}
                </span>
                <span className="text-r-neutral-title-1 font-medium">
                  {positionData && positionData?.fundingPayments >= 0
                    ? '+'
                    : '-'}
                  ${positionData?.fundingPayments}
                </span>
              </div>
            </div>
          </>
        )}

        {/* Market Info Section */}
        <div className="text-15 font-medium text-r-neutral-title-1 mt-16 mb-8">
          Info
        </div>
        <div className="bg-r-neutral-card1 rounded-[12px] px-16">
          <div className="flex justify-between text-13 py-16">
            <span className="text-r-neutral-body">
              {t('page.perps.dailyVolume')}
            </span>
            <span className="text-r-neutral-title-1 font-medium">
              {formatUsdValueKMB(Number(currentAssetCtx?.dayNtlVlm || 0))}
            </span>
          </div>

          <div className="flex justify-between text-13 py-16">
            <span className="text-r-neutral-body">
              {t('page.perps.openInterest')}
            </span>
            <span className="text-r-neutral-title-1 font-medium">
              {formatUsdValueKMB(
                Number(currentAssetCtx?.openInterest || 0) *
                  Number(currentAssetCtx?.markPx || 0)
              )}
            </span>
          </div>

          <div className="flex justify-between text-13 py-16">
            <span className="text-r-neutral-body">
              {t('page.perps.funding')}
            </span>
            <span className="text-r-neutral-title-1 font-medium">
              {formatPercent(Number(currentAssetCtx?.funding || 0))}
            </span>
          </div>
        </div>

        {/* Trading History */}
        <div className="text-15 font-medium text-r-neutral-title-1 mt-16 mb-8">
          {t('page.perps.history')}
        </div>
        <div className="bg-r-neutral-card1 rounded-[12px] p-16">
          <div className="space-y-12">
            <div className="flex items-center justify-between py-8">
              <div className="flex items-center gap-8">
                <div className="w-6 h-6 rounded-full bg-orange-500"></div>
                <div>
                  <div className="text-13 font-medium text-r-neutral-title-1">
                    {t('page.perps.openLong')}
                  </div>
                  <div className="text-12 text-r-neutral-foot">
                    {coin?.toUpperCase()}-USD
                  </div>
                </div>
              </div>
              <div className="text-12 text-r-neutral-foot">
                {t('page.perps.timeAgo', { time: '1 min' })}
              </div>
            </div>
          </div>
        </div>

        <div className="text-12 text-r-neutral-foot mt-12">
          {t('page.perps.openPositionTips')}
        </div>

        <div className="h-[80px]"></div>
        {/* Position Button - Fixed at bottom */}
        <div className="fixed bottom-0 left-0 right-0 border-t-[0.5px] border-solid border-rabby-neutral-line px-20 py-16 bg-r-neutral-bg2">
          {hasPosition ? (
            <Button
              block
              type="primary"
              size="large"
              className="h-[48px] bg-blue-500 border-blue-500 text-white text-15 font-medium rounded-[8px]"
              onClick={() => {
                setClosePositionVisible(true);
              }}
            >
              {positionData?.direction === 'Long'
                ? t('page.perps.closeLong')
                : t('page.perps.closeShort')}
            </Button>
          ) : (
            <div className="flex gap-12 justify-center">
              <Button
                size="large"
                type="primary"
                className="h-[48px] bg-blue-500 border-blue-500 text-white text-15 font-medium rounded-[8px] flex-1"
                onClick={() => {
                  setPositionDirection('Long');
                  setOpenPositionVisible(true);
                }}
              >
                {t('page.perps.long')}
              </Button>
              <Button
                size="large"
                type="primary"
                className="h-[48px] bg-blue-500 border-blue-500 text-white text-15 font-medium rounded-[8px] flex-1"
                onClick={() => {
                  setPositionDirection('Short');
                  setOpenPositionVisible(true);
                }}
              >
                {t('page.perps.short')}
              </Button>
            </div>
          )}
        </div>
      </div>

      <PerpsOpenPositionPopup
        visible={openPositionVisible}
        direction={positionDirection}
        providerFee={providerFee}
        coin={coin}
        pxDecimals={currentAssetCtx?.pxDecimals || 2}
        szDecimals={currentAssetCtx?.szDecimals || 0}
        leverageRang={[1, currentAssetCtx?.maxLeverage || 5]}
        markPrice={markPrice}
        availableBalance={Number(accountSummary?.withdrawable || 0)}
        onCancel={() => setOpenPositionVisible(false)}
        handleOpenPosition={handleOpenPosition}
        onConfirm={() => {
          setOpenPositionVisible(false);
        }}
      />

      <ClosePositionPopup
        visible={closePositionVisible}
        coin={coin}
        providerFee={providerFee}
        direction={positionDirection}
        positionSize={currentPosition?.position.szi || '0'}
        pnl={positionData?.pnl || 0}
        onCancel={() => setClosePositionVisible(false)}
        onConfirm={() => {
          setClosePositionVisible(false);
        }}
        handleClosePosition={async () => {
          await handleClosePosition({
            coin,
            size: currentPosition?.position.szi || '0',
            direction: positionData?.direction as 'Long' | 'Short',
            price: ((activeAssetCtx?.markPx as unknown) as string) || '0',
          });
        }}
      />
    </div>
  );
};

export default PerpsSingleCoin;
