import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import store, { useRabbySelector } from '@/ui/store';
import type { PerpsState } from '@/ui/models/perps';
import {
  LimitOrderType,
  OrderSide,
  OrderSideInfo,
  TPSLConfigItem,
  TradingContainerProps,
} from '../../../types';
import { TPSLSettings } from '../components/TPSLSettings';
import { OrderInfoGrid } from '../components/OrderInfoGrid';
import { usePerpsProPosition } from '../../../hooks/usePerpsProPosition';
import { useMemoizedFn, useRequest } from 'ahooks';
import { Dropdown, Menu, Tooltip } from 'antd';
import clsx from 'clsx';
import { OrderSideAndFunds } from '../components/OrderSideAndFunds';
import { PositionSizeInputAndSliderV2 as PositionSizeInputAndSlider } from '../components/PositionSizeInputAndSliderV2';
import { usePerpsTradingState } from '../../../hooks/usePerpsTradingState';
import { validatePriceInput } from '@/ui/views/Perps/utils';
import { formatTpOrSlPrice } from '@/ui/views/Perps/utils';
import { splitNumberByStep } from '@/ui/utils';
import eventBus from '@/eventBus';
import { EVENTS } from '@/constant';
import { RcIconArrowDownCC } from '@/ui/assets/desktop/common';
import { PerpsCheckbox } from '../components/PerpsCheckbox';
import { DesktopPerpsInputV2 as DesktopPerpsInput } from '../../DesktopPerpsInputV2';
import { TradingButtons } from '../components/TradingButtons';
import { BigNumber } from 'bignumber.js';
import stats from '@/stats';
import { formatPerpsCoin, getStatsReportSide } from '../../../utils';
import { resolveTriggerComparator } from '../../../tpslTrigger';
import { calcAmountFromPercentage } from '../utils';
import { PerpsDropdown } from '../components';
import { LimitOrderTypeSelector } from '../components/LimitOrderTypeSelector';
import perpsToast from '../../PerpsToast';
import { useOrderConfirm } from '../../../modal/OrderConfirmProvider';
import type {
  OrderConfirmRow,
  OrderConfirmSection,
} from '../../../modal/OrderConfirmModal';
import {
  ConfirmAmount,
  LiveLiquidation,
  LiveMarkPrice,
} from '../../../modal/OrderConfirmLiveValues';

type BboStrategy = 'cp1' | 'cp5' | 'q1' | 'q5';

const BBO_STRATEGY_OPTIONS: { key: BboStrategy; label: string }[] = [
  { key: 'cp1', label: 'Counterparty 1' },
  { key: 'cp5', label: 'Counterparty 5' },
  { key: 'q1', label: 'Queue 1' },
  { key: 'q5', label: 'Queue 5' },
];

/**
 * Counterparty takes the opposing side of the book (buy→asks, sell→bids);
 * Queue joins the user's own side (buy→bids, sell→asks). `1`/`5` pick the best
 * level or the fifth.
 */
const resolveBboPrice = (
  prices: PerpsState['bboPrices'],
  strategy: BboStrategy,
  isBuy: boolean
): string => {
  const isCounterparty = strategy === 'cp1' || strategy === 'cp5';
  const isFive = strategy === 'cp5' || strategy === 'q5';
  const useAsk = isBuy === isCounterparty;
  if (useAsk) return isFive ? prices.asks5 : prices.asks1;
  return isFive ? prices.bids5 : prices.bids1;
};

/** The numbers an order actually sends, frozen at click time. */
interface LimitOrderSnapshot {
  size: string;
  /**
   * Only set when the user typed a price. A BBO order commits to a book level,
   * not to a number, so there is nothing to freeze — see `bboStrategy`.
   */
  limitPx?: string;
  /** Set instead of `limitPx` when BBO is on; resolved against the live book at submit. */
  bboStrategy?: BboStrategy;
  tpTriggerPx?: string;
  slTriggerPx?: string;
}

export const LimitTradingContainer: React.FC<TradingContainerProps> = () => {
  const { t } = useTranslation();

  // Get data from perpsState
  const {
    currentPerpsAccount,
    leverageType,
    selectedCoin,
    positionSize,
    setPositionSize,
    currentPosition,
    markPrice,
    midPrice,
    szDecimals,
    pxDecimals,
    leverage,
    availableBalance,
    quoteAsset,
    reduceOnly,
    setReduceOnly,
    tradeSize,
    maxBuyTradeSize,
    maxSellTradeSize,
    currentMarketData,
    percentage,
    setPercentage,
    tpslConfig,
    tpslConfigHasError,
    setTpslConfig,
    handleTPSLEnabledChange,
    resetForm,
    validateTpslForSide,
    sizeDisplayUnit,
    setSizeDisplayUnit,
    reduceOnlyBuyDisabled,
    reduceOnlySellDisabled,
    calcDirectionInfo,
  } = usePerpsTradingState();
  const bboPrices = useRabbySelector((state) => state.perps.bboPrices);

  const [limitPrice, setLimitPrice] = React.useState(
    formatTpOrSlPrice(midPrice, szDecimals)
  );
  const hasFillLimitPrice = React.useRef(false);
  useEffect(() => {
    if (!hasFillLimitPrice.current && midPrice) {
      const price = formatTpOrSlPrice(midPrice, szDecimals);
      setLimitPrice(price);
      hasFillLimitPrice.current = true;
      eventBus.emit(EVENTS.PERPS.SWITCH_LIMIT_FILL_PRICE, price);
    }
  }, [midPrice, szDecimals]);

  const [limitOrderType, setLimitOrderType] = React.useState<LimitOrderType>(
    'Gtc'
  );

  // BBO state
  const [bboEnabled, setBboEnabled] = React.useState(false);
  const [bboStrategy, setBboStrategy] = React.useState<BboStrategy>('cp1');

  // BBO: direction-specific prices
  const { bboBuyPrice, bboSellPrice } = useMemo(
    () => ({
      bboBuyPrice: resolveBboPrice(bboPrices, bboStrategy, true),
      bboSellPrice: resolveBboPrice(bboPrices, bboStrategy, false),
    }),
    [bboStrategy, bboPrices]
  );

  // BBO disabled reason
  const bboDisabledReason = useMemo(() => {
    if (tpslConfig.enabled) return 'TP/SL';
    if (limitOrderType === 'Ioc') return 'IOC';
    if (limitOrderType === 'Alo') return 'ALO';
    return '';
  }, [tpslConfig.enabled, limitOrderType, t]);

  const canEnableBbo = !bboDisabledReason;

  // Auto-disable BBO when conflict arises
  useEffect(() => {
    if (bboEnabled && !canEnableBbo) {
      setBboEnabled(false);
      setLimitPrice(formatTpOrSlPrice(midPrice, szDecimals));
    }
  }, [canEnableBbo]);

  const handleBboToggle = () => {
    if (bboEnabled) {
      // Disable BBO → fill midPrice
      setBboEnabled(false);
      setLimitPrice(formatTpOrSlPrice(midPrice, szDecimals));
    } else if (canEnableBbo) {
      setBboEnabled(true);
    }
  };
  // Direction-specific limit prices (BBO mode uses orderbook sides)
  const buyLimitPrice = bboEnabled ? bboBuyPrice : limitPrice;
  const sellLimitPrice = bboEnabled ? bboSellPrice : limitPrice;

  // Estimated price: BBO mode → midPrice, manual → use limitPrice as-is
  const estBuyPrice = bboEnabled ? midPrice : Number(limitPrice) || midPrice;
  const estSellPrice = bboEnabled ? midPrice : Number(limitPrice) || midPrice;

  const priceForCalculation = useMemo(() => {
    return bboEnabled ? midPrice : Number(limitPrice) || midPrice;
  }, [bboEnabled, midPrice, limitPrice]);

  // Safety factor to avoid hitting exchange margin limits at 100% (fees, funding, etc.)
  const MARGIN_SAFETY = 0.99;

  const limitMaxBuyTradeSize = React.useMemo(() => {
    if (reduceOnly) {
      return currentPosition?.side === 'Short'
        ? currentPosition.size.toFixed(szDecimals)
        : '0';
    }
    if (!estBuyPrice) return maxBuyTradeSize;
    const balanceBasedMax =
      availableBalance > 0
        ? Number(
            new BigNumber(availableBalance)
              .multipliedBy(leverage)
              .multipliedBy(MARGIN_SAFETY)
              .div(estBuyPrice)
              .toFixed(szDecimals, BigNumber.ROUND_DOWN)
          )
        : 0;
    const closable =
      currentPosition?.side === 'Short' ? currentPosition.size : 0;
    return (balanceBasedMax + closable).toFixed(szDecimals);
  }, [
    estBuyPrice,
    availableBalance,
    leverage,
    szDecimals,
    currentPosition,
    maxBuyTradeSize,
    reduceOnly,
  ]);

  const limitMaxSellTradeSize = React.useMemo(() => {
    if (reduceOnly) {
      return currentPosition?.side === 'Long'
        ? currentPosition.size.toFixed(szDecimals)
        : '0';
    }
    if (!estSellPrice) return maxSellTradeSize;
    const balanceBasedMax =
      availableBalance > 0
        ? Number(
            new BigNumber(availableBalance)
              .multipliedBy(leverage)
              .multipliedBy(MARGIN_SAFETY)
              .div(estSellPrice)
              .toFixed(szDecimals, BigNumber.ROUND_DOWN)
          )
        : 0;
    const closable =
      currentPosition?.side === 'Long' ? currentPosition.size : 0;
    return (balanceBasedMax + closable).toFixed(szDecimals);
  }, [
    estSellPrice,
    availableBalance,
    leverage,
    szDecimals,
    currentPosition,
    maxSellTradeSize,
    reduceOnly,
  ]);

  // Limit-specific trade sizes: slider mode uses limitMax instead of hook's market-based max
  const limitBuyTradeSize = React.useMemo(() => {
    if (positionSize.inputSource === 'slider' && percentage > 0) {
      return calcAmountFromPercentage(
        percentage,
        limitMaxBuyTradeSize,
        szDecimals
      );
    }
    return tradeSize;
  }, [
    positionSize.inputSource,
    percentage,
    limitMaxBuyTradeSize,
    szDecimals,
    tradeSize,
  ]);

  const limitSellTradeSize = React.useMemo(() => {
    if (positionSize.inputSource === 'slider' && percentage > 0) {
      return calcAmountFromPercentage(
        percentage,
        limitMaxSellTradeSize,
        szDecimals
      );
    }
    return tradeSize;
  }, [
    positionSize.inputSource,
    percentage,
    limitMaxSellTradeSize,
    szDecimals,
    tradeSize,
  ]);

  // Use hook's calcDirectionInfo with direction-specific estPrice and limit-based trade sizes
  const buyDirInfo = React.useMemo(
    () => calcDirectionInfo('Long', limitBuyTradeSize, estBuyPrice),
    [calcDirectionInfo, limitBuyTradeSize, estBuyPrice]
  );
  const sellDirInfo = React.useMemo(
    () => calcDirectionInfo('Short', limitSellTradeSize, estSellPrice),
    [calcDirectionInfo, limitSellTradeSize, estSellPrice]
  );

  const wsActiveAssetCtx = useRabbySelector(
    (state) => state.perps.wsActiveAssetCtx
  );

  const { currentBestAskPrice, currentBestBidPrice } = React.useMemo(() => {
    if (wsActiveAssetCtx && wsActiveAssetCtx.coin === selectedCoin) {
      const impactPxs = wsActiveAssetCtx?.ctx.impactPxs;
      return {
        currentBestAskPrice: Number(impactPxs[1] || 0),
        currentBestBidPrice: Number(impactPxs[0] || 0),
      };
    }
    return {
      currentBestAskPrice: midPrice,
      currentBestBidPrice: midPrice,
    };
  }, [wsActiveAssetCtx, markPrice, selectedCoin]);

  // Form validation (direction-agnostic, ALO check moved to button click)
  const validation = React.useMemo(() => {
    let error: string = '';
    const tradeSize = Number(positionSize.amount) || 0;
    // BBO mode: use max of both direction prices for shared validation
    const refPrice = bboEnabled
      ? Math.max(Number(buyLimitPrice || 0), Number(sellLimitPrice || 0))
      : Number(limitPrice || 0);
    const notionalNum = tradeSize * refPrice;

    if (notionalNum === 0) {
      return { isValid: false, error: '' };
    }

    // Check minimum order size ($10)
    if (notionalNum < 10) {
      error = t('page.perpsPro.tradingPanel.minimumOrderSize');
      return { isValid: false, error };
    }

    // Check max trade size (shared: use max of both directions)
    const effectiveMaxTradeSize = reduceOnly
      ? Number(
          (currentPosition?.side === 'Long'
            ? limitMaxSellTradeSize
            : limitMaxBuyTradeSize) || 0
        )
      : Math.max(
          Number(limitMaxBuyTradeSize || 0),
          Number(limitMaxSellTradeSize || 0)
        );
    if (effectiveMaxTradeSize && tradeSize > effectiveMaxTradeSize) {
      error = t('page.perpsPro.tradingPanel.insufficientBalance');
      return { isValid: false, error };
    }

    // Check maximum position size
    const maxUsdValue = Number(currentMarketData?.maxUsdValueSize || 1000000);
    if (notionalNum > maxUsdValue) {
      error =
        t('page.perpsPro.tradingPanel.maximumOrderSize', {
          amount: `$${maxUsdValue}`,
        }) || `Maximum order size is $${maxUsdValue}`;
      return { isValid: false, error };
    }

    return {
      isValid: error === '',
      error,
    };
  }, [
    positionSize.amount,
    reduceOnly,
    bboEnabled,
    buyLimitPrice,
    sellLimitPrice,
    limitPrice,
    percentage,
    currentMarketData,
    currentPosition,
    limitMaxBuyTradeSize,
    limitMaxSellTradeSize,
    t,
  ]);

  // ALO validation is deferred to button click (see openOrder)

  const { handleOpenLimitOrder } = usePerpsProPosition();

  const getDirectionTradeSize = (isBuy: boolean): string => {
    if (positionSize.inputSource === 'slider') {
      const dirMax = isBuy ? limitMaxBuyTradeSize : limitMaxSellTradeSize;
      return calcAmountFromPercentage(percentage, dirMax, szDecimals);
    }
    return tradeSize;
  };

  // Shared by the submit path and the confirmation dialog so the trigger price
  // shown is exactly the one sent.
  const getTriggerPrice = useMemoizedFn(
    (item: TPSLConfigItem, isBuy: boolean) => {
      if (!tpslConfig.enabled || !item.value) return undefined;
      if (item.settingMode === 'price') {
        return item.value;
      }
      return isBuy ? item.buyTriggerPrice : item.sellTriggerPrice;
    }
  );

  // The dialog's rows are built once at click time while `submit` runs whenever
  // the user confirms, yet the size and the PNL/ROI trigger prices all re-derive
  // from streaming balance and orderbook data. Freezing them into one snapshot
  // is what keeps the order that is sent identical to the one that was shown.
  //
  // The BBO price is the deliberate exception: the user picked a book level, not
  // a number, so only the strategy is frozen and the price is read off the book
  // at submit time.
  const buildOrderSnapshot = useMemoizedFn(
    (isBuy: boolean): LimitOrderSnapshot => ({
      size: getDirectionTradeSize(isBuy),
      limitPx: bboEnabled ? undefined : limitPrice,
      bboStrategy: bboEnabled ? bboStrategy : undefined,
      tpTriggerPx: getTriggerPrice(tpslConfig.takeProfit, isBuy),
      slTriggerPx: getTriggerPrice(tpslConfig.stopLoss, isBuy),
    })
  );

  /**
   * Direction-specific checks the form can't run until a side is picked;
   * returns false and reports the reason itself when the order can't proceed.
   *
   * Runs before the confirmation dialog opens: an order that can only be
   * rejected would otherwise bounce the user off a dialog whose explanation
   * (an inline TP/SL field error) sits behind the modal's blurred mask.
   */
  const validateDirection = useMemoizedFn((isBuy: boolean) => {
    if (limitOrderType === 'Alo') {
      if (isBuy && Number(limitPrice) >= Number(currentBestAskPrice)) {
        perpsToast.error({
          title: t('page.perps.toast.orderError'),
          description: t('page.perpsPro.tradingPanel.aloTooLargeBuy'),
        });
        return false;
      }
      if (!isBuy && Number(limitPrice) <= Number(currentBestBidPrice)) {
        perpsToast.error({
          title: t('page.perps.toast.orderError'),
          description: t('page.perpsPro.tradingPanel.aloTooLargeSell'),
        });
        return false;
      }
    }

    if (tpslConfig.enabled) {
      const side = isBuy ? OrderSide.BUY : OrderSide.SELL;
      const orderLimitPx = isBuy ? buyLimitPrice : sellLimitPrice;
      const tpslValidation = validateTpslForSide(side, orderLimitPx);
      if (!tpslValidation.valid) {
        const newConfig = { ...tpslConfig };
        if (tpslValidation.errors.tp) {
          newConfig.takeProfit = {
            ...newConfig.takeProfit,
            error: tpslValidation.errors.tp,
          };
        }
        if (tpslValidation.errors.sl) {
          newConfig.stopLoss = {
            ...newConfig.stopLoss,
            error: tpslValidation.errors.sl,
          };
        }
        setTpslConfig(newConfig);
        return false;
      }
    }

    return true;
  });

  const openOrder = useMemoizedFn(
    async (isBuy: boolean, snapshot: LimitOrderSnapshot) => {
      // Backstop: `validateDirection` already ran at click time, but the prices it
      // checks against keep streaming, so re-check right before sending.
      if (!validateDirection(isBuy)) {
        throw new Error('Invalid order configuration');
      }

      // BBO committed to a book level rather than a number, so read the book as
      // late as possible: `store.getState()` sees the newest `bboPrices` even if
      // this closure was created before the last orderbook tick rendered.
      const orderLimitPrice = snapshot.bboStrategy
        ? resolveBboPrice(
            store.getState().perps.bboPrices,
            snapshot.bboStrategy,
            isBuy
          )
        : snapshot.limitPx;

      // An empty book level would otherwise be sent as a zero limit price.
      if (!orderLimitPrice || !(Number(orderLimitPrice) > 0)) {
        perpsToast.error({
          title: t('page.perps.toast.orderError'),
          description: t('page.perpsPro.tradingPanel.bboPriceUnavailable'),
        });
        throw new Error('Missing limit price');
      }

      await handleOpenLimitOrder({
        coin: selectedCoin,
        dex: currentMarketData?.dexId ?? '',
        isBuy,
        size: snapshot.size,
        limitPx: orderLimitPrice,
        tpTriggerPx: snapshot.tpTriggerPx,
        slTriggerPx: snapshot.slTriggerPx,
        reduceOnly,
        orderType: limitOrderType,
      });
      stats.report('perpsTradeHistory', {
        created_at: new Date().getTime(),
        user_addr: currentPerpsAccount?.address || '',
        trade_type: 'limit',
        leverage: leverage.toString(),
        trade_side: getStatsReportSide(isBuy, reduceOnly),
        margin_mode: leverageType === 'cross' ? 'cross' : 'isolated',
        coin: selectedCoin,
        size: tradeSize,
        price: orderLimitPrice,
        trade_usd_value: new BigNumber(orderLimitPrice)
          .times(tradeSize)
          .toFixed(2),
        service_provider: 'hyperliquid',
        app_version: process.env.release || '0',
        address_type: currentPerpsAccount?.type || '',
      });
      if (tpslConfig.enabled) {
        const tpTrigger = snapshot.tpTriggerPx;
        tpTrigger &&
          stats.report('perpsTradeHistory', {
            created_at: new Date().getTime(),
            user_addr: currentPerpsAccount?.address || '',
            trade_type: 'take profit in limit',
            leverage: leverage.toString(),
            trade_side: getStatsReportSide(!isBuy, reduceOnly),
            margin_mode: leverageType === 'cross' ? 'cross' : 'isolated',
            coin: selectedCoin,
            size: tradeSize,
            price: tpTrigger,
            trade_usd_value: new BigNumber(tpTrigger)
              .times(tradeSize)
              .toFixed(2),
            service_provider: 'hyperliquid',
            app_version: process.env.release || '0',
            address_type: currentPerpsAccount?.type || '',
          });
        const slTrigger = snapshot.slTriggerPx;
        slTrigger &&
          stats.report('perpsTradeHistory', {
            created_at: new Date().getTime(),
            user_addr: currentPerpsAccount?.address || '',
            trade_type: 'stop market in limit',
            leverage: leverage.toString(),
            trade_side: getStatsReportSide(!isBuy, reduceOnly),
            margin_mode: leverageType === 'cross' ? 'cross' : 'isolated',
            coin: selectedCoin,
            size: tradeSize,
            price: slTrigger,
            trade_usd_value: new BigNumber(slTrigger)
              .times(tradeSize)
              .toFixed(2),
            service_provider: 'hyperliquid',
            app_version: process.env.release || '0',
            address_type: currentPerpsAccount?.type || '',
          });
      }
    }
  );

  // `runAsync` (rather than `run`) so the confirmation dialog can await the
  // submission: it stays loading until the order settles, and stays open when
  // it fails.
  const { runAsync: handleBuyOrder, loading: buyLoading } = useRequest(
    (snapshot: LimitOrderSnapshot) => openOrder(true, snapshot),
    {
      manual: true,
      onSuccess: () => {
        resetForm();
      },
      onError: (e) => {
        console.error('Failed to open buy order:', e);
      },
    }
  );

  const { runAsync: handleSellOrder, loading: sellLoading } = useRequest(
    (snapshot: LimitOrderSnapshot) => openOrder(false, snapshot),
    {
      manual: true,
      onSuccess: () => {
        resetForm();
      },
      onError: (e) => {
        console.error('Failed to open sell order:', e);
      },
    }
  );

  // Build OrderSideInfo for buy and sell (using hook's calcDirectionInfo)
  const buyOrderInfo: OrderSideInfo = React.useMemo(
    () => ({
      liqPrice: buyDirInfo.liqPrice,
      liqPriceNum: buyDirInfo.liqPriceNum,
      cost: buyDirInfo.cost,
      max: limitMaxBuyTradeSize || '0',
    }),
    [buyDirInfo, limitMaxBuyTradeSize]
  );

  const sellOrderInfo: OrderSideInfo = React.useMemo(
    () => ({
      liqPrice: sellDirInfo.liqPrice,
      liqPriceNum: sellDirInfo.liqPriceNum,
      cost: sellDirInfo.cost,
      max: limitMaxSellTradeSize || '0',
    }),
    [sellDirInfo, limitMaxSellTradeSize]
  );

  const requestConfirm = useOrderConfirm();

  const buildConfirmContent = useMemoizedFn(
    (isBuy: boolean, snapshot: LimitOrderSnapshot) => {
      const { limitPx, bboStrategy: snapshotStrategy } = snapshot;
      const { liqPriceNum } = isBuy ? buyOrderInfo : sellOrderInfo;

      const rows: OrderConfirmRow[] = [];

      // A BBO order is submitted at whatever the book shows when it is sent, so
      // quoting a number here would promise a price the order never commits to;
      // show the strategy the user actually picked. Without BBO this is the
      // typed price, frozen, and it is exactly what gets sent as `limitPx`.
      const bboLabel = snapshotStrategy
        ? BBO_STRATEGY_OPTIONS.find((o) => o.key === snapshotStrategy)?.label
        : '';
      if (bboLabel) {
        rows.push({
          key: 'price',
          label: t('page.perpsPro.orderConfirm.price'),
          value: bboLabel,
        });
      } else if (limitPx && Number(limitPx) > 0) {
        rows.push({
          key: 'price',
          label: t('page.perpsPro.orderConfirm.price'),
          value: `${splitNumberByStep(limitPx)} ${quoteAsset}`,
        });
      }

      if (markPrice) {
        rows.push({
          key: 'markPrice',
          label: t('page.perpsPro.orderConfirm.markPrice'),
          value: (
            <LiveMarkPrice
              coin={selectedCoin}
              fallback={markPrice}
              pxDecimals={pxDecimals}
              quoteAsset={quoteAsset}
            />
          ),
        });
      }

      rows.push({
        key: 'amount',
        label: t('page.perpsPro.orderConfirm.amount'),
        value: (
          <ConfirmAmount
            amount={snapshot.size}
            coin={selectedCoin}
            price={priceForCalculation}
            quoteAsset={quoteAsset}
          />
        ),
      });

      // Always shown; `LiveLiquidation` renders `-` when there is nothing to
      // show — a reduce-only order, or no mark price to measure against.
      // The entry is the price the user typed, so the liquidation price is
      // fixed and only the distance moves with the mark. A BBO order has no
      // frozen price to anchor it to — it resolves off the book at submit — so
      // it passes no `orderPrice` and both figures follow the mark, the closest
      // honest reference available before the order is sent.
      const liqCellProps = {
        direction: (isBuy ? 'Long' : 'Short') as 'Long' | 'Short',
        size: snapshot.size,
        orderPrice: limitPx,
        pxDecimals,
      };
      rows.push(
        {
          key: 'estLiqPrice',
          label: t('page.perpsPro.orderConfirm.estLiqPrice'),
          value: <LiveLiquidation {...liqCellProps} variant="price" />,
        },
        {
          key: 'estLiqDistance',
          label: t('page.perpsPro.orderConfirm.estLiqDistance'),
          value: <LiveLiquidation {...liqCellProps} variant="distance" />,
        }
      );

      rows.push({
        key: 'reduceOnly',
        label: t('page.perpsPro.orderConfirm.reduceOnly'),
        value: reduceOnly
          ? t('page.perpsPro.orderConfirm.true')
          : t('page.perpsPro.orderConfirm.false'),
      });

      const sections: OrderConfirmSection[] = [{ key: 'order', rows }];

      const { tpTriggerPx: tpTrigger, slTriggerPx: slTrigger } = snapshot;
      if (tpslConfig.enabled && (tpTrigger || slTrigger)) {
        // TP/SL attached to a limit order are always market trigger orders
        // (`isMarket: true` in `limitOrderOpen`).
        const markPriceLabel = t('page.perpsPro.orderConfirm.markPrice');
        const tpslRows: OrderConfirmRow[] = [];
        if (tpTrigger) {
          tpslRows.push(
            {
              key: 'tpType',
              label: t('page.perpsPro.orderConfirm.takeProfitMarket'),
              value: t('page.perpsPro.orderConfirm.marketPrice'),
            },
            {
              key: 'tpTrigger',
              label: t('page.perpsPro.orderConfirm.trigger'),
              value: `${markPriceLabel}${resolveTriggerComparator(
                isBuy,
                true
              )}${splitNumberByStep(tpTrigger)} ${quoteAsset}`,
            }
          );
        }
        if (slTrigger) {
          tpslRows.push(
            {
              key: 'slType',
              label: t('page.perpsPro.orderConfirm.stopLossMarket'),
              value: t('page.perpsPro.orderConfirm.marketPrice'),
            },
            {
              key: 'slTrigger',
              label: t('page.perpsPro.orderConfirm.trigger'),
              value: `${markPriceLabel}${resolveTriggerComparator(
                isBuy,
                false
              )}${splitNumberByStep(slTrigger)} ${quoteAsset}`,
            }
          );
        }
        sections.push({
          key: 'tpsl',
          heading: t('page.perpsPro.orderConfirm.tpSl'),
          rows: tpslRows,
        });
      }

      return {
        title: `${formatPerpsCoin(selectedCoin)}-${quoteAsset}`,
        titleSuffix: {
          text: isBuy
            ? t('page.perpsPro.orderConfirm.buyLong')
            : t('page.perpsPro.orderConfirm.sellShort'),
          tone: (isBuy ? 'up' : 'down') as 'up' | 'down',
        },
        sections,
      };
    }
  );

  const handleOrderClick = useMemoizedFn((isBuy: boolean) => {
    // Keep the direction-specific checks ahead of the dialog: otherwise the
    // user would confirm an order that can only fail validation.
    if (!validateDirection(isBuy)) return;

    const snapshot = buildOrderSnapshot(isBuy);

    // With the dialog turned off `requestConfirm` passes the submit promise
    // straight through; swallow its rejection (openOrder already toasts and
    // useRequest's onError logs) so it never surfaces as unhandled.
    Promise.resolve(
      requestConfirm({
        type: 'limit',
        content: () => buildConfirmContent(isBuy, snapshot),
        dontShowAgainText: t('page.perpsPro.orderConfirm.dontShowAgain', {
          orderType: t('page.perpsPro.orderConfirm.orderTypeName.limit'),
        }),
        submit: () =>
          isBuy ? handleBuyOrder(snapshot) : handleSellOrder(snapshot),
      })
    ).catch(() => {});
  });

  useEffect(() => {
    setLimitPrice(formatTpOrSlPrice(midPrice, szDecimals));
  }, [selectedCoin]);

  useEffect(() => {
    const handleClickPrice = (price: string) => {
      setLimitPrice(price.toString());
    };
    eventBus.addEventListener(
      EVENTS.PERPS.HANDLE_CLICK_PRICE,
      handleClickPrice
    );

    return () => {
      eventBus.removeEventListener(
        EVENTS.PERPS.HANDLE_CLICK_PRICE,
        handleClickPrice
      );
    };
  }, []);

  const handleLimitPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (validatePriceInput(value, szDecimals)) {
      setLimitPrice(value);
    }
  };

  return (
    <div className="flex flex-col gap-[12px]">
      <OrderSideAndFunds
        availableBalance={availableBalance}
        quoteAsset={quoteAsset}
      />

      <div className="flex flex-col gap-[6px] mt-[6px] mb-[6px]">
        <span className="text-rb-neutral-secondary text-[12px] leading-[14px]">
          {t('page.perpsPro.tradingPanel.price')}
        </span>
        <div className="flex items-center gap-8">
          {bboEnabled ? (
            <PerpsDropdown
              options={BBO_STRATEGY_OPTIONS}
              onSelect={(key) => setBboStrategy(key as BboStrategy)}
            >
              <div className="flex-1 h-[44px] flex items-center justify-between px-[6px] rounded-[6px] border border-solid border-rb-neutral-line bg-rb-neutral-bg-5 cursor-pointer">
                <span className="text-[15px] text-rb-neutral-title-1">
                  {BBO_STRATEGY_OPTIONS.find((o) => o.key === bboStrategy)
                    ?.label || 'Counterparty 1'}
                </span>
                <RcIconArrowDownCC className="text-rb-neutral-secondary" />
              </div>
            </PerpsDropdown>
          ) : (
            <DesktopPerpsInput
              value={limitPrice}
              onChange={handleLimitPriceChange}
              className="text-left"
              suffix={
                <span className="text-15 text-rb-neutral-title-1">
                  {quoteAsset}
                </span>
              }
            />
          )}
          <Tooltip
            overlayClassName="rectangle"
            placement="topRight"
            title={
              bboDisabledReason
                ? t('page.perpsPro.tradingPanel.bboDisabledTooltip', {
                    bboDisabledReason,
                  })
                : t('page.perpsPro.tradingPanel.bboTips')
            }
          >
            <div
              className={clsx(
                'min-w-[64px] h-[44px] relative flex items-center justify-center text-center text-15 rounded-[6px] border border-solid cursor-pointer',
                bboEnabled
                  ? 'bg-rb-brand-light-1 text-rb-neutral-title-1 border-rb-brand-default'
                  : canEnableBbo
                  ? 'bg-rb-neutral-bg-2 text-r-neutral-title-1 border-transparent hover:border-rb-brand-default'
                  : 'bg-rb-neutral-bg-2 text-r-neutral-title-1 border-transparent opacity-50'
              )}
              onClick={handleBboToggle}
            >
              BBO
            </div>
          </Tooltip>
        </div>
      </div>

      {/* Position Size Input */}
      <PositionSizeInputAndSlider
        price={priceForCalculation}
        maxBuyTradeSize={limitMaxBuyTradeSize}
        maxSellTradeSize={limitMaxSellTradeSize}
        positionSize={positionSize}
        setPositionSize={setPositionSize}
        percentage={percentage}
        setPercentage={setPercentage}
        baseAsset={selectedCoin}
        szDecimals={szDecimals}
        quoteAsset={quoteAsset}
        sizeDisplayUnit={sizeDisplayUnit}
        onUnitChange={setSizeDisplayUnit}
        reduceOnly={reduceOnly}
      />

      <div className="h-[1px] bg-rb-neutral-line my-[12px]" />

      <div className="flex flex-col gap-[6px]">
        <PerpsCheckbox
          checked={tpslConfig.enabled}
          onChange={(enabled) => {
            handleTPSLEnabledChange(enabled);
            if (enabled) {
              setReduceOnly(false);
            }
          }}
          tooltipText={t('page.perpsPro.tradingPanel.tpSlTips')}
          title={t('page.perpsPro.tradingPanel.tpSl')}
          disabled={reduceOnly}
        />
        {tpslConfig.enabled && (
          <TPSLSettings
            szDecimals={szDecimals}
            config={tpslConfig}
            setConfig={setTpslConfig}
            price={limitPrice}
            leverage={leverage}
            tradeSize={tradeSize}
          />
        )}
      </div>

      <div className="flex items-center justify-between h-14">
        <PerpsCheckbox
          checked={reduceOnly}
          onChange={(checked) => {
            setReduceOnly(checked);
            if (checked) {
              handleTPSLEnabledChange(false);
            }
          }}
          tooltipText={t('page.perpsPro.tradingPanel.reduceOnlyTips')}
          title={t('page.perpsPro.tradingPanel.reduceOnly')}
          disabled={!currentPosition}
        />
        <LimitOrderTypeSelector
          value={limitOrderType}
          onChange={setLimitOrderType}
        />
      </div>

      {/* Buy/Sell Buttons */}
      <TradingButtons
        onBuyClick={() => handleOrderClick(true)}
        onSellClick={() => handleOrderClick(false)}
        buyLoading={buyLoading}
        sellLoading={sellLoading}
        buyDisabled={
          !validation.isValid || tpslConfigHasError || reduceOnlyBuyDisabled
        }
        sellDisabled={
          !validation.isValid || tpslConfigHasError || reduceOnlySellDisabled
        }
        buyError={validation.error}
        sellError={validation.error}
      />

      {/* Order Info Grid */}
      <OrderInfoGrid
        buy={buyOrderInfo}
        sell={sellOrderInfo}
        displayUnit={sizeDisplayUnit}
        selectedCoin={selectedCoin}
        reduceOnly={reduceOnly}
        quoteAsset={quoteAsset}
        price={priceForCalculation}
      />
    </div>
  );
};
