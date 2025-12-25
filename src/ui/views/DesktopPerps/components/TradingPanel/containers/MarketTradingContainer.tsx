import React from 'react';
import { useTranslation } from 'react-i18next';
import { useRabbySelector } from '@/ui/store';
import { formatUsdValue } from '@/ui/utils';
import { calLiquidationPrice } from '@/ui/views/Perps/utils';
import {
  OrderSide,
  OrderSummaryData,
  PositionSize,
  TPSLConfig,
  TPSLInputMode,
  TradingContainerProps,
} from '../../../types';
import { PositionSizeInput } from '../components/PositionSizeInput';
import { PositionSlider } from '../components/PositionSlider';
import { ReduceOnlyToggle } from '../components/ReduceOnlyToggle';
import { TPSLSettings } from '../components/TPSLSettings';
import { OrderSummary } from '../components/OrderSummary';

export const MarketTradingContainer: React.FC<TradingContainerProps> = () => {
  const { t } = useTranslation();

  // Get data from perpsState
  const perpsState = useRabbySelector((state) => state.perps);
  const {
    accountSummary,
    positionAndOpenOrders,
    selectedCoin = 'ETH',
  } = perpsState;

  // Get current market data for selected coin
  const currentMarketData = React.useMemo(() => {
    return perpsState.marketDataMap?.[selectedCoin] || null;
  }, [perpsState.marketDataMap, selectedCoin]);

  // Get current position for selected coin
  const currentPosition = React.useMemo(() => {
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

  // Mark price from market data
  const markPrice = React.useMemo(() => {
    return Number(currentMarketData?.markPx || 0);
  }, [currentMarketData]);

  // Available balance
  const availableBalance = React.useMemo(() => {
    return Number(accountSummary?.withdrawable || 0);
  }, [accountSummary]);

  // Asset decimals
  const szDecimals = currentMarketData?.szDecimals || 4;
  const pxDecimals = currentMarketData?.pxDecimals || 2;
  const maxLeverage = currentMarketData?.maxLeverage || 25;

  // Local state
  const [orderSide, setOrderSide] = React.useState<OrderSide>(OrderSide.BUY);
  const [leverage, setLeverage] = React.useState(maxLeverage);
  const [positionSize, setPositionSize] = React.useState<PositionSize>({
    amount: '',
    notionalValue: '',
  });
  const [percentage, setPercentage] = React.useState(0);
  const [reduceOnly, setReduceOnly] = React.useState(false);
  const [tpslConfig, setTpslConfig] = React.useState<TPSLConfig>({
    enabled: false,
    inputMode: TPSLInputMode.PRICE,
    takeProfit: { price: '', percentage: '', expectedPnL: '' },
    stopLoss: { price: '', percentage: '', expectedPnL: '' },
  });

  // Update leverage when maxLeverage changes
  React.useEffect(() => {
    if (maxLeverage > 0 && leverage > maxLeverage) {
      setLeverage(maxLeverage);
    }
  }, [maxLeverage, leverage]);

  // Calculate trade amount (notional value)
  const tradeAmount = React.useMemo(() => {
    const notional = Number(positionSize.notionalValue) || 0;
    return notional;
  }, [positionSize.notionalValue]);

  // Calculate margin required
  const marginRequired = React.useMemo(() => {
    return tradeAmount / leverage;
  }, [tradeAmount, leverage]);

  // Calculate trade size (in base asset)
  const tradeSize = React.useMemo(() => {
    if (!markPrice || !tradeAmount) return '0';
    return (tradeAmount / markPrice).toFixed(szDecimals);
  }, [tradeAmount, markPrice, szDecimals]);

  // Calculate liquidation price
  const estimatedLiquidationPrice = React.useMemo(() => {
    if (!markPrice || !leverage || !tradeAmount) return '';
    const direction = orderSide === OrderSide.BUY ? 'Long' : 'Short';
    const size = Number(tradeSize);
    if (size === 0) return '';

    const liqPrice = calLiquidationPrice(
      markPrice,
      marginRequired,
      direction,
      size,
      tradeAmount,
      maxLeverage
    );
    return `$${liqPrice.toFixed(pxDecimals)}`;
  }, [
    markPrice,
    leverage,
    tradeAmount,
    orderSide,
    tradeSize,
    marginRequired,
    maxLeverage,
    pxDecimals,
  ]);

  // Calculate margin usage percentage
  const marginUsage = React.useMemo(() => {
    if (!availableBalance || availableBalance === 0) return '0.0%';
    const usage = (marginRequired / availableBalance) * 100;
    return `${Math.min(usage, 100).toFixed(1)}%`;
  }, [marginRequired, availableBalance]);

  // Form validation
  const validation = React.useMemo(() => {
    const errors: string[] = [];
    const notionalNum = Number(positionSize.notionalValue) || 0;

    if (notionalNum === 0) {
      return { isValid: false, errors: [] };
    }

    // Check minimum order size ($10)
    if (notionalNum < 10) {
      errors.push(
        t('page.perps.minimumOrderSize') || 'Minimum order size is $10'
      );
    }

    // Check available balance
    if (marginRequired > availableBalance) {
      errors.push(
        t('page.perps.insufficientBalance') || 'Insufficient balance'
      );
    }

    // Check maximum position size
    const maxUsdValue = Number(currentMarketData?.maxUsdValueSize || 1000000);
    if (notionalNum > maxUsdValue) {
      errors.push(
        t('page.perps.maximumOrderSize', { amount: `$${maxUsdValue}` }) ||
          `Maximum order size is $${maxUsdValue}`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }, [
    positionSize.notionalValue,
    marginRequired,
    availableBalance,
    currentMarketData,
    t,
  ]);

  // Handlers
  const handleAmountChange = (amount: string) => {
    if (!markPrice) {
      setPositionSize({ amount, notionalValue: '' });
      return;
    }

    const amountNum = Number(amount) || 0;
    const notionalValue = amountNum * markPrice;
    const notionalStr = notionalValue > 0 ? notionalValue.toFixed(2) : '';

    setPositionSize({
      amount,
      notionalValue: notionalStr,
    });

    if (availableBalance > 0) {
      const marginNeeded = notionalValue / leverage;
      const pct = Math.min((marginNeeded / availableBalance) * 100, 100);
      setPercentage(Math.round(pct));
    }
  };

  const handleNotionalChange = (notional: string) => {
    if (!markPrice) {
      setPositionSize({ amount: '', notionalValue: notional });
      return;
    }

    const notionalNum = Number(notional) || 0;
    const amount = notionalNum / markPrice;
    const amountStr = amount > 0 ? amount.toFixed(szDecimals) : '';

    setPositionSize({
      amount: amountStr,
      notionalValue: notional,
    });

    if (availableBalance > 0) {
      const marginNeeded = notionalNum / leverage;
      const pct = Math.min((marginNeeded / availableBalance) * 100, 100);
      setPercentage(Math.round(pct));
    }
  };

  const handlePercentageChange = (newPercentage: number) => {
    setPercentage(newPercentage);

    const margin = (availableBalance * newPercentage) / 100;
    const notionalValue = margin * leverage;

    if (notionalValue === 0 || !markPrice) {
      setPositionSize({ amount: '', notionalValue: '' });
      return;
    }

    const amount = notionalValue / markPrice;
    setPositionSize({
      amount: amount.toFixed(szDecimals),
      notionalValue: notionalValue.toFixed(2),
    });
  };

  const handleTPSLEnabledChange = (enabled: boolean) => {
    if (!enabled) {
      setTpslConfig({
        ...tpslConfig,
        enabled: false,
        takeProfit: { price: '', percentage: '', expectedPnL: '' },
        stopLoss: { price: '', percentage: '', expectedPnL: '' },
      });
    } else {
      setTpslConfig({ ...tpslConfig, enabled: true });
    }
  };

  const handleTPSLInputModeChange = (mode: TPSLInputMode) => {
    setTpslConfig({ ...tpslConfig, inputMode: mode });
  };

  const handleTakeProfitChange = (
    field: 'price' | 'percentage',
    value: string
  ) => {
    const newConfig = {
      ...tpslConfig.takeProfit,
      [field]: value,
    };

    if (field === 'price' && value && markPrice && tradeSize) {
      const tpPrice = Number(value);
      const size = Number(tradeSize);
      const direction = orderSide === OrderSide.BUY ? 'Long' : 'Short';
      const priceDiff =
        direction === 'Long' ? tpPrice - markPrice : markPrice - tpPrice;
      const pnl = priceDiff * size;
      newConfig.expectedPnL =
        pnl >= 0 ? `+${formatUsdValue(pnl)}` : formatUsdValue(pnl);

      if (marginRequired > 0) {
        const pnlPercent = (pnl / marginRequired) * 100;
        newConfig.percentage = pnlPercent.toFixed(2);
      }
    }

    setTpslConfig({
      ...tpslConfig,
      takeProfit: newConfig,
    });
  };

  const handleStopLossChange = (
    field: 'price' | 'percentage',
    value: string
  ) => {
    const newConfig = {
      ...tpslConfig.stopLoss,
      [field]: value,
    };

    if (field === 'price' && value && markPrice && tradeSize) {
      const slPrice = Number(value);
      const size = Number(tradeSize);
      const direction = orderSide === OrderSide.BUY ? 'Long' : 'Short';
      const priceDiff =
        direction === 'Long' ? slPrice - markPrice : markPrice - slPrice;
      const pnl = priceDiff * size;
      newConfig.expectedPnL =
        pnl >= 0 ? `+${formatUsdValue(pnl)}` : formatUsdValue(pnl);

      if (marginRequired > 0) {
        const pnlPercent = (pnl / marginRequired) * 100;
        newConfig.percentage = pnlPercent.toFixed(2);
      }
    }

    setTpslConfig({
      ...tpslConfig,
      stopLoss: newConfig,
    });
  };

  const handlePlaceOrder = () => {
    console.log('Place order', {
      orderSide,
      positionSize,
      reduceOnly,
      tpslConfig,
    });
  };

  const orderSummary: OrderSummaryData = React.useMemo(() => {
    return {
      liquidationPrice: estimatedLiquidationPrice,
      liquidationDistance: '',
      orderValue: tradeAmount > 0 ? formatUsdValue(tradeAmount) : '$0.00',
      marginUsage,
      slippage: '0.01% / Max 8%',
    };
  }, [estimatedLiquidationPrice, tradeAmount, marginUsage]);

  return (
    <div className="space-y-[16px]">
      {/* Buy/Sell Tabs */}
      <div className="flex items-center gap-[8px]">
        <button
          onClick={() => setOrderSide(OrderSide.BUY)}
          className={`flex-1 h-[32px] rounded-[8px] font-medium text-[12px] transition-colors ${
            orderSide === OrderSide.BUY
              ? 'bg-rb-green-default text-rb-neutral-InvertHighlight '
              : 'bg-rb-neutral-bg-2 text-rb-neutral-title-1'
          }`}
        >
          {t('page.perpsPro.tradingPanel.buyLong')}
        </button>
        <button
          onClick={() => setOrderSide(OrderSide.SELL)}
          className={`flex-1 h-[32px] rounded-[8px] font-medium text-[12px] transition-colors ${
            orderSide === OrderSide.SELL
              ? 'bg-rb-red-default text-rb-neutral-InvertHighlight '
              : 'bg-rb-neutral-bg-2 text-rb-neutral-title-1'
          }`}
        >
          {t('page.perpsPro.tradingPanel.sellShort')}
        </button>
      </div>

      {/* Available Funds & Current Position */}
      <div className="space-y-[4px]">
        <div className="flex items-center justify-between">
          <span className="text-r-neutral-foot text-[12px] font-medium">
            {t('page.perpsPro.tradingPanel.availableFunds')}
          </span>
          <span className="text-r-neutral-title-1 text-[12px] font-medium">
            {formatUsdValue(availableBalance)} USDC
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-r-neutral-foot text-[12px] font-medium">
            {t('page.perpsPro.tradingPanel.currentPosition')}
          </span>
          <span className="text-r-neutral-title-1 text-[12px] font-medium">
            {currentPosition
              ? `${currentPosition.size.toFixed(szDecimals)} ${selectedCoin}`
              : `0 ${selectedCoin}`}
          </span>
        </div>
      </div>

      {/* Position Size Input */}
      <PositionSizeInput
        positionSize={positionSize}
        baseAsset={selectedCoin}
        quoteAsset="USDC"
        precision={{ amount: szDecimals, price: pxDecimals }}
        onAmountChange={handleAmountChange}
        onNotionalChange={handleNotionalChange}
      />

      {/* Position Slider */}
      <PositionSlider
        percentage={percentage}
        onChange={handlePercentageChange}
      />

      {/* TP/SL and Reduce Only */}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-[8px] cursor-pointer">
          <input
            type="checkbox"
            checked={tpslConfig.enabled}
            onChange={(e) => handleTPSLEnabledChange(e.target.checked)}
            className="w-[16px] h-[16px] rounded-[4px] accent-blue-600"
          />
          <span className="text-r-neutral-title-1 text-[13px]">
            {t('page.perpsPro.tradingPanel.tpSl')}
          </span>
        </label>

        <ReduceOnlyToggle
          checked={reduceOnly}
          disabled={!currentPosition}
          onChange={setReduceOnly}
        />
      </div>

      {/* TP/SL Settings Expanded */}
      {tpslConfig.enabled && (
        <TPSLSettings
          config={tpslConfig}
          hasPosition={!!currentPosition}
          onEnabledChange={handleTPSLEnabledChange}
          onInputModeChange={handleTPSLInputModeChange}
          onTakeProfitChange={handleTakeProfitChange}
          onStopLossChange={handleStopLossChange}
        />
      )}

      {/* Error Messages */}
      {validation.errors.length > 0 && (
        <div className="space-y-[8px]">
          {validation.errors.map((error, index) => (
            <div
              key={index}
              className="px-[12px] py-[8px] rounded-[8px] bg-r-orange-light text-r-orange-default text-[12px]"
            >
              {error}
            </div>
          ))}
        </div>
      )}

      {/* Place Order Button */}
      <button
        onClick={handlePlaceOrder}
        disabled={!validation.isValid}
        className={`w-full h-[40px] rounded-[8px] font-medium text-[13px] mt-20 transition-opacity ${
          validation.isValid
            ? orderSide === OrderSide.BUY
              ? 'bg-rb-green-default text-rb-neutral-InvertHighlight'
              : 'bg-rb-red-default text-rb-neutral-InvertHighlight'
            : 'bg-rb-neutral-bg-2 text-rb-neutral-foot opacity-50 cursor-not-allowed'
        }`}
      >
        {orderSide === OrderSide.BUY
          ? t('page.perpsPro.tradingPanel.buyLong')
          : t('page.perpsPro.tradingPanel.sellShort')}
      </button>

      {/* Order Summary */}
      <OrderSummary
        data={orderSummary}
        showTPSLExpected={tpslConfig.enabled}
        tpExpectedPnL={
          tpslConfig.enabled ? tpslConfig.takeProfit.expectedPnL : undefined
        }
        slExpectedPnL={
          tpslConfig.enabled ? tpslConfig.stopLoss.expectedPnL : undefined
        }
      />
    </div>
  );
};
