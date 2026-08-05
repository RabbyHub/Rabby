import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useRabbySelector } from '@/ui/store';
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
import {
  calculateDistanceToLiquidation,
  formatPerpsPct,
  formatTpOrSlPrice,
} from '@/ui/views/Perps/utils';
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

/** The numbers an order actually sends, frozen at click time. */
interface LimitOrderSnapshot {
  size: string;
  limitPx: string;
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
  type BboStrategy = 'cp1' | 'cp5' | 'q1' | 'q5';
  const [bboEnabled, setBboEnabled] = React.useState(false);
  const [bboStrategy, setBboStrategy] = React.useState<BboStrategy>('cp1');

  const bboStrategyOptions = useMemo(
    () => [
      { key: 'cp1', label: 'Counterparty 1' },
      { key: 'cp5', label: 'Counterparty 5' },
      { key: 'q1', label: 'Queue 1' },
      { key: 'q5', label: 'Queue 5' },
    ],
    []
  );

  // BBO: direction-specific prices
  // Counterparty = opposing side: buy→asks, sell→bids
  // Queue = same side: buy→bids, sell→asks
  const { bboBuyPrice, bboSellPrice } = useMemo(() => {
    const isCounterparty = bboStrategy === 'cp1' || bboStrategy === 'cp5';
    const isFive = bboStrategy === 'cp5' || bboStrategy === 'q5';
    const askKey = isFive ? 'asks5' : 'asks1';
    const bidKey = isFive ? 'bids5' : 'bids1';
    return {
      bboBuyPrice: isCounterparty ? bboPrices[askKey] : bboPrices[bidKey],
      bboSellPrice: isCounterparty ? bboPrices[bidKey] : bboPrices[askKey],
    };
  }, [bboStrategy, bboPrices]);

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
  // the user confirms, yet the size, the BBO limit price and the PNL/ROI trigger
  // prices all re-derive from streaming balance and orderbook data. Freezing
  // them into one snapshot is what keeps the order that is sent identical to the
  // one that was shown.
  const buildOrderSnapshot = useMemoizedFn(
    (isBuy: boolean): LimitOrderSnapshot => ({
      size: getDirectionTradeSize(isBuy),
      limitPx: isBuy ? buyLimitPrice : sellLimitPrice,
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

      const orderLimitPrice = snapshot.limitPx;

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

  /** `-1.86%(-1,230.5)` — signed against the mark price the panel trades on. */
  const formatLiqDistance = (liqPx: number | null) => {
    if (!liqPx || !markPrice) return '';
    const sign = liqPx < markPrice ? '-' : '';
    const gap = splitNumberByStep(
      new BigNumber(liqPx).minus(markPrice).abs().toFixed(pxDecimals)
    );
    return `${sign}${formatPerpsPct(
      calculateDistanceToLiquidation(liqPx, markPrice)
    )}(${sign}${gap})`;
  };

  const buildConfirmContent = useMemoizedFn(
    (isBuy: boolean, snapshot: LimitOrderSnapshot) => {
      const orderLimitPrice = snapshot.limitPx;
      const { liqPrice, liqPriceNum } = isBuy ? buyOrderInfo : sellOrderInfo;
      const liqDistance = formatLiqDistance(liqPriceNum);

      const rows: OrderConfirmRow[] = [];

      // The price actually sent as `limitPx`: the typed limit price, or the
      // orderbook price BBO mode resolved for this direction.
      if (Number(orderLimitPrice) > 0) {
        rows.push({
          key: 'price',
          label: t('page.perpsPro.orderConfirm.price'),
          value: `${splitNumberByStep(orderLimitPrice)} ${quoteAsset}`,
        });
      }

      if (markPrice) {
        rows.push({
          key: 'markPrice',
          label: t('page.perpsPro.orderConfirm.markPrice'),
          value: `${splitNumberByStep(
            new BigNumber(markPrice).toFixed(pxDecimals)
          )} ${quoteAsset}`,
        });
      }

      rows.push({
        key: 'amount',
        label: t('page.perpsPro.orderConfirm.amount'),
        value: `${snapshot.size} ${formatPerpsCoin(selectedCoin)}`,
      });

      // Mirrors OrderInfoGrid: a reduce-only order opens no new exposure, so it
      // has no liquidation price to show.
      if (!reduceOnly && liqPriceNum !== null) {
        rows.push({
          key: 'estLiqPrice',
          label: t('page.perpsPro.orderConfirm.estLiqPrice'),
          value: liqPrice,
        });
        if (liqDistance) {
          rows.push({
            key: 'estLiqDistance',
            label: t('page.perpsPro.orderConfirm.estLiqDistance'),
            value: liqDistance,
          });
        }
      }

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

  const priceForCalculation = useMemo(() => {
    return bboEnabled ? midPrice : Number(limitPrice) || midPrice;
  }, [bboEnabled, midPrice, limitPrice]);

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
              options={bboStrategyOptions}
              onSelect={(key) => setBboStrategy(key as BboStrategy)}
            >
              <div className="flex-1 h-[44px] flex items-center justify-between px-[6px] rounded-[6px] border border-solid border-rb-neutral-line bg-rb-neutral-bg-5 cursor-pointer">
                <span className="text-[15px] text-rb-neutral-title-1">
                  {bboStrategyOptions.find((o) => o.key === bboStrategy)
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
