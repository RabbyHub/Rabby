import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import React, { useCallback, useMemo } from 'react';
import {
  OrderSide,
  Position,
  PositionSize,
  TPSLConfig,
  SizeDisplayUnit,
  OrderSideInfo,
} from '../types';
import { calLiquidationPrice } from '../../Perps/utils';
import { useMemoizedFn } from 'ahooks';
import BigNumber from 'bignumber.js';
import { DEFAULT_TPSL_CONFIG } from '@/ui/models/perps';
import { formatUsdValue, splitNumberByStep } from '@/ui/utils';
import { usePerpsAccount } from '../../Perps/hooks/usePerpsAccount';
import { calcAmountFromPercentage } from '../components/TradingPanel/utils';
import { useTranslation } from 'react-i18next';

export const usePerpsTradingState = () => {
  const { t } = useTranslation();
  const dispatch = useRabbyDispatch();

  // Read trading state from Redux (preserved across orderType switches)
  const {
    clearinghouseState,
    wsActiveAssetCtx,
    selectedCoin = 'ETH',
    currentPerpsAccount,
    marketDataMap,
    wsActiveAssetData,
    tradingPositionSize: positionSize,
    tradingPercentage: percentage,
    tradingTpslConfig: tpslConfig,
    tradingReduceOnly: reduceOnly,
    sizeDisplayUnit,
  } = useRabbySelector((state) => state.perps);

  // Setters using Redux dispatch
  const setPositionSize = useCallback(
    (size: PositionSize | ((prev: PositionSize) => PositionSize)) => {
      if (typeof size === 'function') {
        dispatch.perps.patchState({ tradingPositionSize: size(positionSize) });
      } else {
        dispatch.perps.patchState({ tradingPositionSize: size });
      }
    },
    [dispatch, positionSize]
  );

  const setPercentage = useCallback(
    (pct: number) => {
      dispatch.perps.patchState({ tradingPercentage: pct });
    },
    [dispatch]
  );

  const setTpslConfig = useCallback(
    (config: TPSLConfig | ((prev: TPSLConfig) => TPSLConfig)) => {
      if (typeof config === 'function') {
        dispatch.perps.patchState({ tradingTpslConfig: config(tpslConfig) });
      } else {
        dispatch.perps.patchState({ tradingTpslConfig: config });
      }
    },
    [dispatch, tpslConfig]
  );

  const setReduceOnly = useCallback(
    (value: boolean | ((prev: boolean) => boolean)) => {
      if (typeof value === 'function') {
        dispatch.perps.patchState({ tradingReduceOnly: value(reduceOnly) });
      } else {
        dispatch.perps.patchState({ tradingReduceOnly: value });
      }
    },
    [dispatch, reduceOnly]
  );

  const setSizeDisplayUnit = useCallback(
    (unit: SizeDisplayUnit) => {
      dispatch.perps.updateSizeDisplayUnit(unit);
    },
    [dispatch]
  );

  // Get current market data for selected coin
  const currentMarketData = React.useMemo(() => {
    return marketDataMap?.[selectedCoin] || null;
  }, [marketDataMap, selectedCoin]);

  const crossMargin = React.useMemo(() => {
    return (
      Number(clearinghouseState?.crossMarginSummary.accountValue || 0) -
      Number(clearinghouseState?.crossMaintenanceMarginUsed || 0)
    );
  }, [clearinghouseState?.crossMarginSummary.accountValue]);

  // Get current position for selected coin
  const currentPosition: Position | null = React.useMemo(() => {
    const position = clearinghouseState?.assetPositions?.find(
      (item) => item.position.coin === selectedCoin
    );
    if (!position) return null;

    const p = position.position;
    return {
      size: Math.abs(Number(p.szi || 0)),
      side: Number(p.szi || 0) > 0 ? ('Long' as const) : ('Short' as const),
      entryPrice: Number(p.entryPx || 0),
      leverage: Number(p.leverage.value || 1),
      marginUsed: Number(p.marginUsed || 0),
      liquidationPrice: Number(p.liquidationPx || 0),
      unrealizedPnl: Number(p.unrealizedPnl || 0),
    };
  }, [clearinghouseState, selectedCoin]);

  const markPrice = React.useMemo(() => {
    if (wsActiveAssetCtx && wsActiveAssetCtx.coin === selectedCoin) {
      return Number(wsActiveAssetCtx.ctx.markPx || 0);
    }

    return Number(currentMarketData?.markPx || 0);
  }, [wsActiveAssetCtx, currentMarketData]);

  const midPrice = React.useMemo(() => {
    if (wsActiveAssetCtx && wsActiveAssetCtx.coin === selectedCoin) {
      return Number(wsActiveAssetCtx.ctx.midPx || 0);
    }
    return Number(currentMarketData?.midPx || 0);
  }, [wsActiveAssetCtx, currentMarketData]);

  const szDecimals = currentMarketData?.szDecimals ?? 4;
  const pxDecimals = currentMarketData?.pxDecimals ?? 2;
  const maxLeverage = currentMarketData?.maxLeverage || 25;
  const leverage = wsActiveAssetData?.leverage.value || maxLeverage;
  const leverageType = wsActiveAssetData?.leverage.type || 'isolated';

  const { availableBalance: withdrawableBalance } = usePerpsAccount();

  // Available balance - use withdrawable as direction-agnostic value
  const availableBalance = React.useMemo(() => {
    return Number(withdrawableBalance || 0);
  }, [withdrawableBalance]);

  const maxBuyTradeSize = wsActiveAssetData?.maxTradeSzs[0];
  const maxSellTradeSize = wsActiveAssetData?.maxTradeSzs[1];

  // Calculate trade amount (notional value)
  const tradeUsdAmount = React.useMemo(() => {
    return Number(positionSize.notionalValue) || 0;
  }, [positionSize.notionalValue]);

  // Calculate margin required
  const marginRequired = React.useMemo(() => {
    return tradeUsdAmount / leverage;
  }, [tradeUsdAmount, leverage]);

  // Calculate trade size (in base asset) — reference value for shared validation
  const tradeSize = React.useMemo(() => {
    if (!tradeUsdAmount) return '0';
    return positionSize.amount;
  }, [positionSize.amount, tradeUsdAmount]);

  // Direction-specific trade sizes (percentage mode uses direction-specific max)
  const buyTradeSize = useMemo(() => {
    if (positionSize.inputSource === 'slider' && percentage > 0) {
      return calcAmountFromPercentage(percentage, maxBuyTradeSize, szDecimals);
    }
    return tradeSize;
  }, [
    positionSize.inputSource,
    percentage,
    maxBuyTradeSize,
    szDecimals,
    tradeSize,
  ]);

  const sellTradeSize = useMemo(() => {
    if (positionSize.inputSource === 'slider' && percentage > 0) {
      return calcAmountFromPercentage(percentage, maxSellTradeSize, szDecimals);
    }
    return tradeSize;
  }, [
    positionSize.inputSource,
    percentage,
    maxSellTradeSize,
    szDecimals,
    tradeSize,
  ]);

  // Calculate net new size for a given direction (after closing existing opposite position)
  const calcNetNewSize = useCallback(
    (direction: 'Long' | 'Short', dirSize: number) => {
      if (dirSize === 0 || !currentPosition) return dirSize;
      const posSize = currentPosition.size;
      const posSide = currentPosition.side;
      // Same direction: all is new opening
      if (
        (direction === 'Long' && posSide === 'Long') ||
        (direction === 'Short' && posSide === 'Short')
      ) {
        return dirSize;
      }
      // Opposite direction: first closes existing, remainder is new opening
      return Math.max(0, dirSize - posSize);
    },
    [currentPosition]
  );

  // Calculate liquidation price and cost for a direction
  // orderPrice: optional override (e.g. limitPrice), defaults to markPrice
  const calcDirectionInfo = useCallback(
    (
      direction: 'Long' | 'Short',
      dirTradeSize: string,
      orderPrice?: number | string
    ) => {
      const px = Number(orderPrice ?? markPrice);
      const size = Number(dirTradeSize);
      if (!px || !leverage || size === 0) {
        return { liqPrice: '', cost: '0 USDC' };
      }

      const netNew = calcNetNewSize(direction, size);

      // Cost
      let cost = '$0.00';
      if (!reduceOnly && netNew > 0) {
        const netNewMargin = (netNew * px) / leverage;
        cost = `${splitNumberByStep(netNewMargin.toFixed(2))} USDC`;
      }

      // Liq price
      if (netNew === 0) {
        return { liqPrice: '-', cost };
      }
      const netNewUsd = netNew * px;
      const netNewMargin = netNewUsd / leverage;
      const liqPrice = calLiquidationPrice(
        px,
        leverageType === 'cross' ? crossMargin : netNewMargin,
        direction,
        netNew,
        netNewUsd,
        maxLeverage
      );
      if (!new BigNumber(liqPrice).gt(0)) {
        return { liqPrice: '-', cost };
      }
      return {
        liqPrice: `${splitNumberByStep(liqPrice.toFixed(pxDecimals))} USDC`,
        cost,
      };
    },
    [
      crossMargin,
      markPrice,
      leverageType,
      leverage,
      reduceOnly,
      maxLeverage,
      pxDecimals,
      calcNetNewSize,
    ]
  );

  const buyDirInfo = useMemo(() => calcDirectionInfo('Long', buyTradeSize), [
    calcDirectionInfo,
    buyTradeSize,
  ]);
  const sellDirInfo = useMemo(() => calcDirectionInfo('Short', sellTradeSize), [
    calcDirectionInfo,
    sellTradeSize,
  ]);

  // Max trade sizes - override with position size when reduceOnly
  const effectiveMaxBuyTradeSize = reduceOnly
    ? currentPosition?.side === 'Short'
      ? currentPosition.size.toString()
      : '0'
    : maxBuyTradeSize;
  const effectiveMaxSellTradeSize = reduceOnly
    ? currentPosition?.side === 'Long'
      ? currentPosition.size.toString()
      : '0'
    : maxSellTradeSize;

  const maxBuyDisplay = effectiveMaxBuyTradeSize || '0';
  const maxSellDisplay = effectiveMaxSellTradeSize || '0';

  // Build OrderSideInfo for both sides
  const buyInfo: OrderSideInfo = useMemo(
    () => ({
      liqPrice: buyDirInfo.liqPrice,
      cost: buyDirInfo.cost,
      max: maxBuyDisplay,
    }),
    [buyDirInfo, maxBuyDisplay]
  );

  const sellInfo: OrderSideInfo = useMemo(
    () => ({
      liqPrice: sellDirInfo.liqPrice,
      cost: sellDirInfo.cost,
      max: maxSellDisplay,
    }),
    [sellDirInfo, maxSellDisplay]
  );

  React.useEffect(() => {
    if (!currentPosition) {
      setReduceOnly(false);
    }
  }, [currentPosition?.side]);

  // Calculate margin usage percentage
  const marginUsage = React.useMemo(() => {
    if (reduceOnly) {
      return '-';
    }
    if (!availableBalance || availableBalance === 0) return '0.0%';
    const usage = (marginRequired / availableBalance) * 100;
    return `${Math.min(usage, 100).toFixed(1)}%`;
  }, [marginRequired, availableBalance, reduceOnly]);

  const handleTPSLEnabledChange = useMemoizedFn((enabled: boolean) => {
    dispatch.perps.patchState({
      tradingTpslConfig: { ...tpslConfig, enabled },
    });
  });

  const resetForm = useCallback(() => {
    dispatch.perps.resetTradingState();
  }, [dispatch]);

  // Validate TP/SL for a specific direction (called when button is clicked)
  const validateTpslForSide = useMemoizedFn(
    (
      side: OrderSide,
      customOrderPrice?: number | string
    ): {
      valid: boolean;
      errors: { tp?: string; sl?: string };
    } => {
      if (!tpslConfig.enabled) return { valid: true, errors: {} };

      const errors: { tp?: string; sl?: string } = {};
      const orderPrice = Number(customOrderPrice ?? markPrice);
      const isLong = side === OrderSide.BUY;

      // Get the trigger price for this direction
      const tpTrigger = isLong
        ? Number(tpslConfig.takeProfit.buyTriggerPrice)
        : Number(tpslConfig.takeProfit.sellTriggerPrice);
      const slTrigger = isLong
        ? Number(tpslConfig.stopLoss.buyTriggerPrice)
        : Number(tpslConfig.stopLoss.sellTriggerPrice);

      // Check if TP/SL has a value configured but trigger price resolved to <= 0
      const tpHasValue = !!tpslConfig.takeProfit.value;
      const slHasValue = !!tpslConfig.stopLoss.value;
      const tpIsNonPriceMode = tpslConfig.takeProfit.settingMode !== 'price';
      const slIsNonPriceMode = tpslConfig.stopLoss.settingMode !== 'price';

      // TP validation
      if (tpHasValue && tpIsNonPriceMode && !tpTrigger) {
        errors.tp = t('page.perpsPro.tradingPanel.tpTriggerPriceIsZero', {
          side: isLong
            ? t('page.perpsPro.tradingPanel.sideLongBuy')
            : t('page.perpsPro.tradingPanel.sideShortSell'),
        });
      } else if (tpTrigger) {
        if (isLong && tpTrigger <= orderPrice) {
          errors.tp = t(
            'page.perpsPro.tradingPanel.tpTriggerMoreThanOrderPrice'
          );
        }
        if (!isLong && tpTrigger >= orderPrice) {
          errors.tp = t(
            'page.perpsPro.tradingPanel.tpTriggerLessThanOrderPrice'
          );
        }
      }

      // SL validation
      if (slHasValue && slIsNonPriceMode && !slTrigger) {
        errors.sl = t('page.perpsPro.tradingPanel.slTriggerPriceIsZero', {
          side: isLong
            ? t('page.perpsPro.tradingPanel.sideLongBuy')
            : t('page.perpsPro.tradingPanel.sideShortSell'),
        });
      } else if (slTrigger) {
        if (isLong && slTrigger >= orderPrice) {
          errors.sl = t(
            'page.perpsPro.tradingPanel.slTriggerLessThanOrderPrice'
          );
        }
        if (!isLong && slTrigger <= orderPrice) {
          errors.sl = t(
            'page.perpsPro.tradingPanel.slTriggerMoreThanOrderPrice'
          );
        }
      }

      return {
        valid: Object.keys(errors).length === 0,
        errors,
      };
    }
  );

  const tpslConfigHasError = useMemo(() => {
    return (
      tpslConfig.enabled &&
      Boolean(tpslConfig.takeProfit.error || tpslConfig.stopLoss.error)
    );
  }, [
    tpslConfig.enabled,
    tpslConfig.takeProfit.error,
    tpslConfig.stopLoss.error,
  ]);

  return {
    currentPerpsAccount,
    leverageType,
    crossMargin,
    selectedCoin,
    positionSize,
    setPositionSize,
    currentPosition,
    markPrice,
    midPrice,
    szDecimals,
    pxDecimals,
    maxLeverage,
    leverage,
    availableBalance,
    reduceOnly,
    setReduceOnly,
    tradeUsdAmount,
    marginRequired,
    tradeSize,
    buyEstLiqPrice: buyDirInfo.liqPrice,
    sellEstLiqPrice: sellDirInfo.liqPrice,
    buyInfo,
    sellInfo,
    maxBuyTradeSize,
    maxSellTradeSize,
    marginUsage,
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
    reduceOnlyBuyDisabled: reduceOnly && currentPosition?.side === 'Long',
    reduceOnlySellDisabled: reduceOnly && currentPosition?.side === 'Short',
    calcDirectionInfo,
    buyTradeSize,
    sellTradeSize,
  };
};
