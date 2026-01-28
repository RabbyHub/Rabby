import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import React, { useCallback, useEffect, useMemo } from 'react';
import { OrderSide, Position, PositionSize, TPSLConfig } from '../types';
import { calLiquidationPrice } from '../../Perps/utils';
import { useMemoizedFn } from 'ahooks';
import BigNumber from 'bignumber.js';
import { DEFAULT_TPSL_CONFIG } from '@/ui/models/perps';

export const usePerpsTradingState = () => {
  const dispatch = useRabbyDispatch();

  // Read trading state from Redux (preserved across orderType switches)
  const {
    clearinghouseState,
    wsActiveAssetCtx,
    selectedCoin = 'ETH',
    currentPerpsAccount,
    marketDataMap,
    wsActiveAssetData,
    tradingOrderSide: orderSide,
    tradingPositionSize: positionSize,
    tradingPercentage: percentage,
    tradingTpslConfig: tpslConfig,
    tradingReduceOnly: reduceOnly,
  } = useRabbySelector((state) => state.perps);

  // Setters using Redux dispatch
  const setOrderSide = useCallback(
    (side: OrderSide) => {
      dispatch.perps.patchState({ tradingOrderSide: side });
    },
    [dispatch]
  );

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
    if (
      wsActiveAssetCtx &&
      wsActiveAssetCtx.coin.toUpperCase() === selectedCoin.toUpperCase()
    ) {
      return Number(wsActiveAssetCtx.ctx.markPx || 0);
    }

    return Number(currentMarketData?.markPx || 0);
  }, [wsActiveAssetCtx, currentMarketData]);

  const midPrice = React.useMemo(() => {
    if (
      wsActiveAssetCtx &&
      wsActiveAssetCtx.coin.toUpperCase() === selectedCoin.toUpperCase()
    ) {
      return Number(wsActiveAssetCtx.ctx.midPx || 0);
    }
    return Number(currentMarketData?.midPx || 0);
  }, [wsActiveAssetCtx, currentMarketData]);

  const szDecimals = currentMarketData?.szDecimals ?? 4;
  const pxDecimals = currentMarketData?.pxDecimals ?? 2;
  const maxLeverage = currentMarketData?.maxLeverage || 25;
  const leverage = wsActiveAssetData?.leverage.value || maxLeverage;
  const leverageType = wsActiveAssetData?.leverage.type || 'isolated';

  const availableBalance = React.useMemo(() => {
    const account = Number(clearinghouseState?.withdrawable || 0);
    return Number(
      orderSide === OrderSide.BUY
        ? wsActiveAssetData?.availableToTrade[0] || account
        : wsActiveAssetData?.availableToTrade[1] || account
    );
  }, [
    clearinghouseState,
    wsActiveAssetData?.availableToTrade[0],
    wsActiveAssetData?.availableToTrade[1],
    orderSide,
  ]);

  const maxBuyTradeSize = wsActiveAssetData?.maxTradeSzs[0];
  const maxSellTradeSize = wsActiveAssetData?.maxTradeSzs[1];

  // Calculate trade amount (notional value)
  const tradeUsdAmount = React.useMemo(() => {
    const notional = Number(positionSize.notionalValue) || 0;
    return notional;
  }, [positionSize.notionalValue]);

  // Calculate margin required
  const marginRequired = React.useMemo(() => {
    return tradeUsdAmount / leverage;
  }, [tradeUsdAmount, leverage, reduceOnly]);

  // Calculate trade size (in base asset)
  const tradeSize = React.useMemo(() => {
    if (!tradeUsdAmount) return '0';
    return positionSize.amount;
  }, [positionSize.amount, tradeUsdAmount]);

  // Calculate liquidation price
  const estimatedLiquidationPrice = React.useMemo(() => {
    if (!markPrice || !leverage || !tradeUsdAmount) return '';
    const direction = orderSide === OrderSide.BUY ? 'Long' : 'Short';
    const size = Number(tradeSize);
    if (size === 0) return '';

    const liqPrice = calLiquidationPrice(
      markPrice,
      leverageType === 'cross' ? crossMargin : marginRequired,
      direction,
      size,
      tradeUsdAmount,
      maxLeverage
    );
    if (!new BigNumber(liqPrice).gt(0)) {
      return '-';
    }
    return `$${liqPrice.toFixed(pxDecimals)}`;
  }, [
    crossMargin,
    markPrice,
    leverageType,
    leverage,
    tradeUsdAmount,
    orderSide,
    tradeSize,
    marginRequired,
    maxLeverage,
    pxDecimals,
  ]);

  const maxTradeSize = useMemo(() => {
    const isBuy = orderSide === OrderSide.BUY;
    if (reduceOnly && currentPosition) {
      const currentSide =
        currentPosition.side === 'Long' ? OrderSide.BUY : OrderSide.SELL;
      return currentSide === orderSide ? '0' : currentPosition.size.toString();
    }
    return isBuy ? maxBuyTradeSize : maxSellTradeSize;
  }, [
    orderSide,
    maxBuyTradeSize,
    maxSellTradeSize,
    currentPosition,
    reduceOnly,
  ]);

  useEffect(() => {
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

  const switchOrderSide = useCallback(
    (side: OrderSide) => {
      dispatch.perps.patchState({
        tradingOrderSide: side,
        tradingPositionSize: { amount: '', notionalValue: '' },
        tradingPercentage: 0,
        tradingReduceOnly: false,
        tradingTpslConfig: DEFAULT_TPSL_CONFIG,
      });
    },
    [dispatch]
  );

  const tpslConfigHasError = useMemo(() => {
    return Boolean(tpslConfig.takeProfit.error || tpslConfig.stopLoss.error);
  }, [tpslConfig.takeProfit.error, tpslConfig.stopLoss.error]);

  return {
    leverageType,
    crossMargin,
    selectedCoin,
    orderSide,
    switchOrderSide,
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
    estimatedLiquidationPrice,
    maxTradeSize,
    marginUsage,
    currentMarketData,
    percentage,
    setPercentage,
    tpslConfig,
    tpslConfigHasError,
    setTpslConfig,
    handleTPSLEnabledChange,
    resetForm,
  };
};
