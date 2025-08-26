import React, { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/ui/component';
import { useParams, useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatUsdValue, useWallet } from '@/ui/utils';
import { Button, Switch, Input, message } from 'antd';
import clsx from 'clsx';
import { usePerpsState } from '../usePerpsState';
import Chart from './Chart';
import { CANDLE_MENU_KEY } from '../constants';
import { getPerpsSDK } from '../sdkManager';
import { useMemoizedFn } from 'ahooks';
import {
  CancelOrderParams,
  WsActiveAssetCtx,
} from '@rabby-wallet/hyperliquid-sdk';
import { formatUsdValueKMB } from '../../Dashboard/components/TokenDetailPopup/utils';
import { useRabbySelector } from '@/ui/store';
import { PerpsOpenPositionPopup } from './OpenPositionPopup';
import { ClosePositionPopup } from './ClosePositionPopup';
import { AutoClosePositionPopup } from './AutoClosePositionPopup';
import BigNumber from 'bignumber.js';
import { usePerpsPosition } from '../usePerpsPosition';
import { HistoryPage } from './HistoryPage';
import { usePerpsDeposit } from '../usePerpsDeposit';
import { MiniApproval } from '../../Approval/components/MiniSignTx';
import { PerpsDepositAmountPopup } from './DepositAmountPopup';
import {
  DirectSubmitProvider,
  supportedDirectSign,
  useStartDirectSigning,
} from '@/ui/hooks/useMiniApprovalDirectSign';

export const formatPercent = (value: number, decimals = 8) => {
  return `${(value * 100).toFixed(decimals)}%`;
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

  const {
    refreshData,
    handleOpenPosition,
    handleClosePosition,
    handleSetAutoClose,
    currentPerpsAccount,
    userFills,
  } = usePerpsPosition();
  const [amountVisible, setAmountVisible] = useState(false);
  const [isShowMiniSign, setIsShowMiniSign] = useState(false);
  const {
    miniSignTx,
    clearMiniSignTx,
    updateMiniSignTx,
    handleDeposit,
  } = usePerpsDeposit({
    currentPerpsAccount,
  });
  const wallet = useWallet();
  const startDirectSigning = useStartDirectSigning();

  const singleCoinHistoryList = useMemo(() => {
    return userFills
      .filter((fill) => fill.coin.toLowerCase() === coin?.toLowerCase())
      .sort((a, b) => b.time - a.time);
  }, [userFills, coin]);

  const [activeAssetCtx, setActiveAssetCtx] = React.useState<
    WsActiveAssetCtx['ctx'] | null
  >(null);

  const [openPositionVisible, setOpenPositionVisible] = React.useState(false);
  const [positionDirection, setPositionDirection] = React.useState<
    'Long' | 'Short'
  >('Long');
  const [closePositionVisible, setClosePositionVisible] = React.useState(false);
  const [autoCloseVisible, setAutoCloseVisible] = useState(false);

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

  const { tpPrice, slPrice, tpOid, slOid } = useMemo(() => {
    if (
      !currentPosition ||
      !currentPosition.openOrders ||
      !currentPosition.openOrders.length
    ) {
      return {
        tpPrice: undefined,
        slPrice: undefined,
        tpOid: undefined,
        slOid: undefined,
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
      tpOid: tpItem?.oid,
      slOid: slItem?.oid,
    };
  }, [currentPosition]);

  const hasPosition = useMemo(() => {
    return !!currentPosition;
  }, [currentPosition]);

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

  const miniTxs = useMemo(() => {
    return miniSignTx ? [miniSignTx] : [];
  }, [miniSignTx]);

  const canUseDirectSubmitTx = useMemo(
    () => supportedDirectSign(currentPerpsAccount?.type || ''),
    [currentPerpsAccount?.type]
  );
  const withdrawDisabled = !accountSummary?.withdrawable;

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
        size: Math.abs(Number(currentPosition.position.szi || 0)),
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
        fundingPayments: currentPosition.position.cumFunding.sinceOpen,
      }
    : null;

  const hasAutoClose = useMemo(() => {
    return Boolean(tpPrice || slPrice);
  }, [tpPrice, slPrice]);

  const handleAutoCloseSwitch = useMemoizedFn(async (e: boolean) => {
    if (e) {
      setAutoCloseVisible(true);
    } else {
      // 取消所有止盈止损订单
      const sdk = getPerpsSDK();
      if (!tpOid && !slOid) {
        console.error('no find auto close order id');
        return;
      }

      const cancelOrders: CancelOrderParams[] = [];
      if (tpOid) {
        cancelOrders.push({
          oid: tpOid,
          coin,
        });
      }
      if (slOid) {
        cancelOrders.push({
          oid: slOid,
          coin,
        });
      }
      await sdk.exchange?.cancelOrder(cancelOrders);
      message.success('Auto close position canceled successfully');
      refreshData();
    }
  });

  const AutoCloseInfo = useMemo(() => {
    if (hasAutoClose) {
      if (tpPrice && slPrice) {
        const Line = (
          <span className="text-r-neutral-line text-13 mr-4 ml-4">|</span>
        );
        return (
          <div className="text-r-neutral-title-1 font-medium text-13">
            ${tpPrice} {t('page.perps.takeProfit')}
            {Line}${slPrice}
            {t('page.perps.stopLoss')}
          </div>
        );
      } else if (tpPrice) {
        return (
          <div className="text-r-neutral-title-1 font-medium text-13">
            ${tpPrice} {t('page.perps.takeProfit')}
          </div>
        );
      } else if (slPrice) {
        return (
          <div className="text-r-neutral-title-1 font-medium text-13">
            ${slPrice} {t('page.perps.stopLoss')}
          </div>
        );
      } else {
        return null;
      }
    }
  }, [hasAutoClose, tpPrice, slPrice]);

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
              {dayDelta.toFixed(currentAssetCtx?.pxDecimals || 2)} (
              {isPositiveChange ? '+' : ''}
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
            <div
              className="text-r-blue-default text-13 cursor-pointer px-16 py-10 rounded-[8px] bg-r-blue-light-1"
              onClick={() => {
                setAmountVisible(true);
              }}
            >
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
                  ${positionData?.positionValue} = {positionData?.size} {coin}
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
                  {AutoCloseInfo}
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

        <HistoryPage
          marketData={marketDataMap}
          historyData={singleCoinHistoryList}
        />

        <div className="text-12 text-r-neutral-foot mt-12">
          {t('page.perps.openPositionTips')}
        </div>

        <div className="h-[40px]"></div>
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
        positionSize={positionData?.size.toString() || '0'}
        pnl={positionData?.pnl || 0}
        onCancel={() => setClosePositionVisible(false)}
        onConfirm={() => {
          setClosePositionVisible(false);
        }}
        handleClosePosition={async () => {
          await handleClosePosition({
            coin,
            size: positionData?.size.toString() || '0',
            direction: positionData?.direction as 'Long' | 'Short',
            price: ((activeAssetCtx?.markPx as unknown) as string) || '0',
          });
        }}
      />

      {/* Auto Close Position Popup */}
      <AutoClosePositionPopup
        visible={autoCloseVisible}
        coin={coin}
        type="hasPosition"
        price={positionData?.entryPrice || markPrice}
        direction={(positionData?.direction || 'Long') as 'Long' | 'Short'}
        size={Math.abs(positionData?.size || 0)}
        pxDecimals={currentAssetCtx?.szDecimals || 2}
        onClose={() => setAutoCloseVisible(false)}
        handleSetAutoClose={async (params: {
          tpPrice: string;
          slPrice: string;
        }) => {
          await handleSetAutoClose({
            coin,
            tpTriggerPx: params.tpPrice,
            slTriggerPx: params.slPrice,
            direction: positionData?.direction as 'Long' | 'Short',
          });
        }}
      />

      <PerpsDepositAmountPopup
        visible={amountVisible}
        currentPerpsAccount={currentPerpsAccount}
        type={'deposit'}
        availableBalance={accountSummary?.withdrawable || '0'}
        onChange={(amount) => {
          updateMiniSignTx(amount);
        }}
        onCancel={() => {
          setAmountVisible(false);
          clearMiniSignTx();
        }}
        onConfirm={async (amount) => {
          if (canUseDirectSubmitTx) {
            if (currentPerpsAccount) {
              await wallet.changeAccount(currentPerpsAccount);
            }
            startDirectSigning();
          } else {
            handleDeposit();
          }
          return true;
        }}
      />

      <MiniApproval
        txs={miniTxs}
        visible={isShowMiniSign}
        ga={{
          category: 'Perps',
          source: 'Perps',
          trigger: 'Perps',
        }}
        onClose={() => {
          clearMiniSignTx();
          setIsShowMiniSign(false);
        }}
        onReject={() => {
          clearMiniSignTx();
          setIsShowMiniSign(false);
        }}
        onResolve={() => {
          setAmountVisible(false);
          setTimeout(() => {
            setIsShowMiniSign(false);
            clearMiniSignTx();
          }, 500);
        }}
        onPreExecError={() => {
          setAmountVisible(false);
          // fallback to normal sign
          handleDeposit();
        }}
        directSubmit
        canUseDirectSubmitTx={canUseDirectSubmitTx}
      />
    </div>
  );
};

const PerpsSingleCoinWrapper = () => {
  return (
    <DirectSubmitProvider>
      <PerpsSingleCoin />
    </DirectSubmitProvider>
  );
};

export default PerpsSingleCoinWrapper;
