import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useRabbySelector } from '@/ui/store';
import { formatUsdValue } from '@/ui/utils';
import {
  OrderSide,
  OrderSummaryData,
  TradingContainerProps,
} from '../../../types';
import { TPSLSettings } from '../components/TPSLSettings';
import { OrderSummary } from '../components/OrderSummary';
import { usePerpsProPosition } from '../../../hooks/usePerpsProPosition';
import { useRequest } from 'ahooks';
import { Button } from 'antd';
import clsx from 'clsx';
import { OrderSideAndFunds } from '../components/OrderSideAndFunds';
import { PositionSizeInputAndSlider } from '../components/PositionSizeInputAndSlider';
import { usePerpsTradingState } from '../../../hooks/usePerpsTradingState';

export const MarketTradingContainer: React.FC<TradingContainerProps> = () => {
  const { t } = useTranslation();

  // Get data from perpsState
  const {
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
  } = usePerpsTradingState();

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

  const { handleOpenMarketOrder } = usePerpsProPosition();

  const {
    run: handleOpenOrderRequest,
    loading: handleOpenOrderLoading,
  } = useRequest(
    async () => {
      await handleOpenMarketOrder({
        coin: selectedCoin,
        isBuy: orderSide === OrderSide.BUY,
        size: tradeSize,
        midPx: midPrice.toString(),
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

  return (
    <div className="space-y-[16px]">
      {/* Buy/Sell Tabs */}
      <OrderSideAndFunds
        orderSide={orderSide}
        switchOrderSide={switchOrderSide}
        availableBalance={availableBalance}
        currentPosition={currentPosition}
        selectedCoin={selectedCoin}
      />

      {/* Position Size Input */}
      <PositionSizeInputAndSlider
        price={markPrice}
        maxTradeSize={maxTradeSize}
        positionSize={positionSize}
        setPositionSize={setPositionSize}
        percentage={percentage}
        setPercentage={setPercentage}
        baseAsset={selectedCoin}
        quoteAsset="USDC"
        precision={{ amount: szDecimals, price: pxDecimals }}
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
          setConfig={setTpslConfig}
          orderSide={orderSide}
          tradeSize={tradeSize}
          price={midPrice}
          marginRequired={marginRequired}
        />
      )}

      {/* Place Order Button */}
      <Button
        loading={handleOpenOrderLoading}
        onClick={handleOpenOrderRequest}
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
