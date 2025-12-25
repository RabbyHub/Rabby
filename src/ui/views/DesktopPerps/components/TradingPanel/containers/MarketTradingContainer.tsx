import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useRabbySelector } from '@/ui/store';
import { formatUsdValue } from '@/ui/utils';
import { calLiquidationPrice, formatTpOrSlPrice } from '@/ui/views/Perps/utils';
import {
  OrderSide,
  OrderSummaryData,
  PositionSize,
  TPSLConfig,
  TradingContainerProps,
} from '../../../types';
import { PositionSizeInput } from '../components/PositionSizeInput';
import { PositionSlider } from '../components/PositionSlider';
import { TPSLSettings } from '../components/TPSLSettings';
import { OrderSummary } from '../components/OrderSummary';
import BigNumber from 'bignumber.js';
import {
  calcAssetAmountByNotional,
  calcAssetNotionalByAmount,
  calculatePnL,
  calculateTargetPrice,
  formatPnL,
} from '../utils';
import { usePerpsProPosition } from '../../../hooks/usePerpsProPosition';
import { useMemoizedFn, useRequest } from 'ahooks';
import { Button } from 'antd';
import clsx from 'clsx';

export const MarketTradingContainer: React.FC<TradingContainerProps> = () => {
  const { t } = useTranslation();

  // Get data from perpsState
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

  console.log('wsActiveAssetData', wsActiveAssetData);

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

  useEffect(() => {
    if (!currentPosition) {
      setReduceOnly(false);
    }
  }, [currentPosition?.side]);

  // Mark price from market data
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

  // Asset decimals
  const szDecimals = currentMarketData?.szDecimals || 4;
  const pxDecimals = currentMarketData?.pxDecimals || 2;
  const maxLeverage = currentMarketData?.maxLeverage || 25;
  const leverage = wsActiveAssetData?.leverage.value || maxLeverage;

  // Local state
  const [orderSide, setOrderSide] = React.useState<OrderSide>(OrderSide.BUY);
  const [positionSize, setPositionSize] = React.useState<PositionSize>({
    amount: '',
    notionalValue: '',
  });
  const [percentage, setPercentage] = React.useState(0);
  const [reduceOnly, setReduceOnly] = React.useState(false);
  const [tpslConfig, setTpslConfig] = React.useState<TPSLConfig>({
    enabled: false,
    takeProfit: { price: '', percentage: '', expectedPnL: '', error: '' },
    stopLoss: { price: '', percentage: '', expectedPnL: '', error: '' },
  });

  // Available balance
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
    if (!markPrice || !tradeUsdAmount) return '0';
    return positionSize.amount;
  }, [positionSize.amount, markPrice, tradeUsdAmount]);

  const noSizeTradeAmount = React.useMemo(() => {
    return Number(tradeSize) === 0;
  }, [tradeSize]);

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

  // Calculate margin usage percentage
  const marginUsage = React.useMemo(() => {
    if (!availableBalance || availableBalance === 0) return '0.0%';
    const usage = (marginRequired / availableBalance) * 100;
    return `${Math.min(usage, 100).toFixed(1)}%`;
  }, [marginRequired, availableBalance]);

  // Form validation
  const validation = React.useMemo(() => {
    let error: string = '';
    const notionalNum = Number(positionSize.notionalValue) || 0;
    const tradeSize = Number(positionSize.amount) || 0;

    if (notionalNum === 0) {
      return {
        isValid: false,
        error:
          reduceOnly && percentage > 0
            ? t('page.perpsPro.tradingPanel.reduceOnlyTooLarge')
            : '',
      };
    }

    // Check minimum order size ($10)
    if (notionalNum < 10) {
      error = t('page.perpsPro.tradingPanel.minimumOrderSize');
      return { isValid: false, error };
    }

    if (maxTradeSize && tradeSize > Number(maxTradeSize)) {
      error = reduceOnly
        ? t('page.perpsPro.tradingPanel.reduceOnlyTooLarge')
        : t('page.perpsPro.tradingPanel.insufficientBalance');
      return { isValid: false, error };
    }

    // no use because reverser is calc in
    // // Check available balance
    // if (marginRequired > availableBalance) {
    //   error = t('page.perpsPro.tradingPanel.insufficientBalance');
    //   return { isValid: false, error };
    // }

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
    positionSize.notionalValue,
    maxTradeSize,
    reduceOnly,
    tradeSize,
    marginRequired,
    availableBalance,
    currentMarketData,
    t,
  ]);

  // Handlers
  const handleAmountChange = useMemoizedFn((amount: string) => {
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
  });

  const handleNotionalChange = useMemoizedFn((notional: string) => {
    if (!markPrice) {
      setPositionSize({ amount: '', notionalValue: notional });
      return;
    }

    let newNotional = notional;
    const notionalNum = new BigNumber(notional || 0);
    let amount = calcAssetAmountByNotional(notional, markPrice, szDecimals);
    if (maxTradeSize && Number(amount) > Number(maxTradeSize)) {
      amount = maxTradeSize;
      newNotional = calcAssetNotionalByAmount(amount, markPrice);
    }
    setPositionSize({
      amount,
      notionalValue: newNotional,
    });

    if (availableBalance > 0) {
      const marginNeeded = notionalNum.div(leverage);
      const pct = Math.min(
        Math.round(
          marginNeeded
            .div(new BigNumber(availableBalance))
            .multipliedBy(100)
            .toNumber()
        ),
        100
      );
      setPercentage(maxTradeSize === amount ? 100 : pct);
    }
  });

  const handlePercentageChange = useMemoizedFn((newPercentage: number) => {
    setPercentage(newPercentage);

    const orderSize = new BigNumber(maxTradeSize || 0)
      .multipliedBy(newPercentage)
      .div(100);
    const notionalValue = orderSize
      .multipliedBy(new BigNumber(markPrice))
      .toNumber();

    if (notionalValue === 0 || !markPrice) {
      setPositionSize({ amount: '', notionalValue: '' });
      return;
    }

    let amount = calcAssetAmountByNotional(
      notionalValue,
      markPrice,
      szDecimals
    );
    let newNotionalValue = calcAssetNotionalByAmount(amount, markPrice);
    if (
      maxTradeSize &&
      (Number(amount) > Number(maxTradeSize) || percentage === 100)
    ) {
      amount = maxTradeSize;
      newNotionalValue = calcAssetNotionalByAmount(maxTradeSize, markPrice);
    }
    setPositionSize({
      amount,
      notionalValue: newNotionalValue,
    });
  });

  const handleTPSLEnabledChange = useMemoizedFn((enabled: boolean) => {
    if (!enabled) {
      setTpslConfig({
        ...tpslConfig,
        enabled: false,
        takeProfit: { price: '', percentage: '', expectedPnL: '', error: '' },
        stopLoss: { price: '', percentage: '', expectedPnL: '', error: '' },
      });
    } else {
      setTpslConfig({ ...tpslConfig, enabled: true });
    }
  });

  const handleTPSLConfigValidation = useMemoizedFn(
    (
      type: 'takeProfit' | 'stopLoss',
      currentConfig: {
        price: string;
        percentage: string;
        expectedPnL: string;
        error: string;
      }
    ) => {
      const direction = orderSide === OrderSide.BUY ? 'Long' : 'Short';
      const currentPrice = Number(currentConfig.price);
      // init error
      currentConfig.error = '';
      if (type === 'takeProfit' && currentPrice) {
        if (direction === 'Long' && currentPrice <= midPrice) {
          currentConfig.error = t(
            'page.perpsPro.tradingPanel.tpMustBeHigherThanCurrentPrice'
          );
        }
        if (direction === 'Short' && currentPrice >= midPrice) {
          currentConfig.error = t(
            'page.perpsPro.tradingPanel.tpMustBeLowerThanCurrentPrice'
          );
        }
      } else if (type === 'stopLoss' && currentPrice) {
        if (direction === 'Long' && currentPrice >= midPrice) {
          currentConfig.error = t(
            'page.perpsPro.tradingPanel.slMustBeLowerThanCurrentPrice'
          );
        }
        if (direction === 'Short' && currentPrice <= midPrice) {
          currentConfig.error = t(
            'page.perpsPro.tradingPanel.slMustBeHigherThanCurrentPrice'
          );
        }
      }
      return currentConfig;
    }
  );

  const tpslConfigHasError = useMemo(() => {
    return Boolean(tpslConfig.takeProfit.error || tpslConfig.stopLoss.error);
  }, [tpslConfig.takeProfit.error, tpslConfig.stopLoss.error]);

  // Common TPSL change handler
  const createTPSLChangeHandler = useMemoizedFn(
    (type: 'takeProfit' | 'stopLoss') => (
      field: 'price' | 'percentage',
      value: string
    ) => {
      const currentConfig = tpslConfig[type];
      const newConfig = {
        ...currentConfig,
        [field]: value,
      };

      const direction = orderSide === OrderSide.BUY ? 'Long' : 'Short';
      const size = Number(tradeSize);

      if (field === 'price' && value && markPrice && size) {
        // Price → Percentage
        const targetPrice = Number(value);
        const pnl = calculatePnL(targetPrice, direction, size, markPrice);
        newConfig.expectedPnL = formatPnL(pnl);

        const pnlPercent = (pnl / marginRequired) * 100;
        newConfig.percentage = pnlPercent.toFixed(2);
      } else if (field === 'percentage' && value && markPrice && size) {
        // Percentage → Price
        const pnlPercent = Number(value);
        const pnl = (pnlPercent * marginRequired) / 100;
        const targetPrice = calculateTargetPrice(
          pnl,
          direction,
          size,
          markPrice
        );

        newConfig.price =
          targetPrice > 0 ? formatTpOrSlPrice(targetPrice, szDecimals) : '';
        newConfig.expectedPnL = formatPnL(pnl);
      }

      if (value === '') {
        newConfig.error = '';
        newConfig.price = '';
        newConfig.percentage = '';
        newConfig.expectedPnL = '';
      }

      setTpslConfig({
        ...tpslConfig,
        [type]: handleTPSLConfigValidation(type, newConfig),
      });
    }
  );

  const handleTakeProfitChange = useMemoizedFn(
    createTPSLChangeHandler('takeProfit')
  );

  const handleStopLossChange = useMemoizedFn(
    createTPSLChangeHandler('stopLoss')
  );

  const resetForm = () => {
    setPositionSize({ amount: '', notionalValue: '' });
    setPercentage(0);
    setReduceOnly(false);
    setTpslConfig({
      enabled: false,
      takeProfit: { price: '', percentage: '', expectedPnL: '', error: '' },
      stopLoss: { price: '', percentage: '', expectedPnL: '', error: '' },
    });
  };

  const { handleOpenMarketOrder } = usePerpsProPosition();

  const {
    run: handleOpenMarketOrderRequest,
    loading: handleOpenMarketOrderLoading,
  } = useRequest(
    async () => {
      await handleOpenMarketOrder({
        coin: selectedCoin,
        isBuy: orderSide === OrderSide.BUY,
        size: tradeSize,
        midPx: markPrice.toString(),
        tpTriggerPx: tpslConfig.takeProfit.price,
        slTriggerPx: tpslConfig.stopLoss.price,
        reduceOnly,
      });
    },
    {
      manual: true,
      onSuccess: () => {
        resetForm();
      },
      onError: (error) => {},
    }
  );

  const orderSummary: OrderSummaryData = React.useMemo(() => {
    return {
      liquidationPrice: estimatedLiquidationPrice,
      liquidationDistance: '',
      orderValue: tradeUsdAmount > 0 ? formatUsdValue(tradeUsdAmount) : '$0.00',
      marginRequired: formatUsdValue(marginRequired),
      marginUsage,
      slippage: '8%',
    };
  }, [estimatedLiquidationPrice, tradeUsdAmount, marginUsage]);

  const switchOrderSide = (side: OrderSide) => {
    setOrderSide(side);
    resetForm();
  };

  return (
    <div className="space-y-[16px]">
      {/* Buy/Sell Tabs */}
      <div className="flex items-center gap-[8px]">
        <button
          onClick={() => switchOrderSide(OrderSide.BUY)}
          className={`flex-1 h-[32px] rounded-[8px] font-medium text-[12px] transition-colors ${
            orderSide === OrderSide.BUY
              ? 'bg-rb-green-default text-rb-neutral-InvertHighlight '
              : 'bg-rb-neutral-bg-2 text-rb-neutral-title-1'
          }`}
        >
          {t('page.perpsPro.tradingPanel.buyLong')}
        </button>
        <button
          onClick={() => switchOrderSide(OrderSide.SELL)}
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
          <span
            className={clsx(
              'text-r-neutral-title-1 text-[12px] font-medium',
              {
                Long: 'text-rb-green-default',
                Short: 'text-rb-red-default',
              }[currentPosition?.side || '']
            )}
          >
            {currentPosition
              ? `${currentPosition.size} ${selectedCoin}`
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
      <div className="flex items-center gap-16">
        <label className="flex items-center gap-[8px] cursor-pointer">
          <input
            type="checkbox"
            checked={tpslConfig.enabled}
            onChange={(e) => handleTPSLEnabledChange(e.target.checked)}
            className="w-[16px] h-[16px] rounded-[4px] accent-blue-600 cursor-pointer"
          />
          <span className="text-r-neutral-title-1 text-[13px]">
            {t('page.perpsPro.tradingPanel.tpSl')}
          </span>
        </label>

        <label
          className={`flex items-center gap-[8px] ${
            !currentPosition
              ? 'cursor-not-allowed opacity-50'
              : 'cursor-pointer'
          }`}
        >
          <input
            type="checkbox"
            checked={!currentPosition ? false : reduceOnly}
            disabled={!currentPosition}
            onChange={(e) => setReduceOnly(e.target.checked)}
            className="w-[16px] h-[16px] rounded-[4px] accent-blue-600 cursor-pointer"
          />
          <span className="text-r-neutral-title-1 text-[13px]">
            Reduce Only
          </span>
        </label>
      </div>

      {/* TP/SL Settings Expanded */}
      {tpslConfig.enabled && (
        <TPSLSettings
          szDecimals={szDecimals}
          config={tpslConfig}
          noSizeTradeAmount={noSizeTradeAmount}
          onTakeProfitChange={handleTakeProfitChange}
          onStopLossChange={handleStopLossChange}
        />
      )}

      {/* Error Messages */}
      {/* {Boolean(validation.error) && (
        <div className="space-y-[8px]">
          <div className="px-[12px] py-[8px] rounded-[8px] bg-rb-orange-light-1 text-rb-orange-default text-[12px]">
            {validation.error}
          </div>
        </div>
      )} */}

      {/* Place Order Button */}
      <Button
        loading={handleOpenMarketOrderLoading}
        onClick={handleOpenMarketOrderRequest}
        disabled={!validation.isValid || tpslConfigHasError}
        className={`w-full h-[40px] rounded-[8px] font-medium text-[13px] mt-20 border-transparent ${
          validation.isValid
            ? orderSide === OrderSide.BUY
              ? 'bg-rb-green-default text-rb-neutral-InvertHighlight'
              : 'bg-rb-red-default text-rb-neutral-InvertHighlight'
            : validation.error
            ? 'bg-rb-orange-light-1 text-rb-orange-default cursor-not-allowed'
            : 'bg-rb-neutral-bg-2 text-rb-neutral-foot opacity-50 cursor-not-allowed'
        }`}
      >
        {validation.error
          ? validation.error
          : orderSide === OrderSide.BUY
          ? t('page.perpsPro.tradingPanel.buyLong')
          : t('page.perpsPro.tradingPanel.sellShort')}
      </Button>

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
