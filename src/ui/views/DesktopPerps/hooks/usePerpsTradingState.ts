import { useRabbySelector } from '@/ui/store';
import React, { useEffect, useMemo } from 'react';
import { OrderSide, Position, PositionSize, TPSLConfig } from '../types';
import { calLiquidationPrice } from '../../Perps/utils';
import { useMemoizedFn } from 'ahooks';
const DEFAULT_TPSL_CONFIG: TPSLConfig = {
  enabled: false,
  takeProfit: { price: '', percentage: '', expectedPnL: '', error: '' },
  stopLoss: { price: '', percentage: '', expectedPnL: '', error: '' },
};

export const usePerpsTradingState = () => {
  const [orderSide, setOrderSide] = React.useState<OrderSide>(OrderSide.BUY);
  const [positionSize, setPositionSize] = React.useState<PositionSize>({
    amount: '',
    notionalValue: '',
  });

  const [percentage, setPercentage] = React.useState(0);
  const [tpslConfig, setTpslConfig] = React.useState<TPSLConfig>(
    DEFAULT_TPSL_CONFIG
  );

  const [reduceOnly, setReduceOnly] = React.useState(false);

  const {
    accountSummary,
    positionAndOpenOrders,
    wsActiveAssetCtx,
    selectedCoin = 'ETH',
    marketDataMap,
    wsActiveAssetData,
  } = useRabbySelector((state) => state.perps);
  // Get current market data for selected coin
  const currentMarketData = React.useMemo(() => {
    return marketDataMap?.[selectedCoin] || null;
  }, [marketDataMap, selectedCoin]);

  // Get current position for selected coin
  const currentPosition: Position | null = React.useMemo(() => {
    const position = positionAndOpenOrders?.find(
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
  }, [positionAndOpenOrders, selectedCoin]);

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

  const currentBestAskPrice = React.useMemo(() => {
    if (
      wsActiveAssetCtx &&
      wsActiveAssetCtx.coin.toUpperCase() === selectedCoin.toUpperCase()
    ) {
      const impactPxs = ((wsActiveAssetCtx?.ctx as unknown) as any)
        .impactPxs as [string, string];
      return Number(impactPxs[1] || 0);
    }
    return markPrice;
  }, [wsActiveAssetCtx, markPrice, selectedCoin]);

  const szDecimals = currentMarketData?.szDecimals || 4;
  const pxDecimals = currentMarketData?.pxDecimals || 2;
  const maxLeverage = currentMarketData?.maxLeverage || 25;
  const leverage = wsActiveAssetData?.leverage.value || maxLeverage;

  const availableBalance = React.useMemo(() => {
    const account = Number(accountSummary?.withdrawable || 0);
    return Number(
      orderSide === OrderSide.BUY
        ? wsActiveAssetData?.availableToTrade[0] || account
        : wsActiveAssetData?.availableToTrade[1] || account
    );
  }, [
    accountSummary,
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
  }, [tradeUsdAmount, leverage]);

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
      marginRequired,
      direction,
      size,
      tradeUsdAmount,
      maxLeverage
    );
    return `$${liqPrice.toFixed(pxDecimals)}`;
  }, [
    markPrice,
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
    if (!availableBalance || availableBalance === 0) return '0.0%';
    const usage = (marginRequired / availableBalance) * 100;
    return `${Math.min(usage, 100).toFixed(1)}%`;
  }, [marginRequired, availableBalance]);

  const handleTPSLEnabledChange = useMemoizedFn((enabled: boolean) => {
    if (!enabled) {
      setTpslConfig(DEFAULT_TPSL_CONFIG);
    } else {
      setTpslConfig({ ...tpslConfig, enabled: true });
    }
  });

  const resetForm = () => {
    setPositionSize({ amount: '', notionalValue: '' });
    setPercentage(0);
    setReduceOnly(false);
    setTpslConfig(DEFAULT_TPSL_CONFIG);
  };

  const switchOrderSide = (side: OrderSide) => {
    setOrderSide(side);
    resetForm();
  };

  const tpslConfigHasError = useMemo(() => {
    return Boolean(tpslConfig.takeProfit.error || tpslConfig.stopLoss.error);
  }, [tpslConfig.takeProfit.error, tpslConfig.stopLoss.error]);

  return {
    selectedCoin,
    orderSide,
    switchOrderSide,
    positionSize,
    setPositionSize,
    currentPosition,
    markPrice,
    midPrice,
    currentBestAskPrice,
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
