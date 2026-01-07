import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useRabbySelector } from '@/ui/store';
import { formatUsdValue } from '@/ui/utils';
import {
  LimitOrderType,
  OrderSide,
  OrderSummaryData,
  TradingContainerProps,
} from '../../../types';
import { TPSLSettings } from '../components/TPSLSettings';
import { OrderSummary } from '../components/OrderSummary';
import { usePerpsProPosition } from '../../../hooks/usePerpsProPosition';
import { useRequest } from 'ahooks';
import { Button, Select } from 'antd';
import clsx from 'clsx';
import { OrderSideAndFunds } from '../components/OrderSideAndFunds';
import { PositionSizeInputAndSlider } from '../components/PositionSizeInputAndSlider';
import { usePerpsTradingState } from '../../../hooks/usePerpsTradingState';
import { validatePriceInput } from '@/ui/views/Perps/utils';
import { formatTpOrSlPrice } from '@/ui/views/Perps/utils';
import eventBus from '@/eventBus';
import { EVENTS } from '@/constant';

interface TakeOrStopMarketTradingContainerProps {
  takeOrStop: 'tp' | 'sl';
}

export const TakeOrStopMarketTradingContainer: React.FC<TakeOrStopMarketTradingContainerProps> = ({
  takeOrStop,
}) => {
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
  const [triggerPrice, setTriggerPrice] = React.useState(
    // formatTpOrSlPrice(midPrice, szDecimals)
    ''
  );

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

    if (
      takeOrStop === 'sl' &&
      orderSide === OrderSide.BUY &&
      Number(triggerPrice) < Number(midPrice)
    ) {
      error = t('page.perpsPro.tradingPanel.slBuyMustBeHigherThanMidPrice');
      return { isValid: false, error };
    }

    if (
      takeOrStop === 'sl' &&
      orderSide === OrderSide.SELL &&
      Number(triggerPrice) > Number(midPrice)
    ) {
      error = t('page.perpsPro.tradingPanel.slSellMustBeLowerThanMidPrice');
      return { isValid: false, error };
    }

    if (
      takeOrStop === 'tp' &&
      orderSide === OrderSide.BUY &&
      Number(triggerPrice) > Number(midPrice)
    ) {
      error = t('page.perpsPro.tradingPanel.tpBuyMustBeLowerThanMidPrice');
      return { isValid: false, error };
    }

    if (
      takeOrStop === 'tp' &&
      orderSide === OrderSide.SELL &&
      Number(triggerPrice) < Number(midPrice)
    ) {
      error = t('page.perpsPro.tradingPanel.tpSellMustBeHigherThanMidPrice');
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
    percentage,
    orderSide,
    tradeSize,
    marginRequired,
    availableBalance,
    currentMarketData,
    midPrice,
    takeOrStop,
    triggerPrice,
    t,
  ]);

  const {
    handleOpenTPSlMarketOrder,
    needEnableTrading,
    handleActionApproveStatus,
  } = usePerpsProPosition();

  const {
    run: handleOpenOrderRequest,
    loading: handleOpenOrderLoading,
  } = useRequest(
    async () => {
      await handleOpenTPSlMarketOrder({
        coin: selectedCoin,
        isBuy: orderSide === OrderSide.BUY,
        size: tradeSize,
        triggerPx: triggerPrice,
        reduceOnly,
        tpsl: takeOrStop,
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
      slippage: undefined,
    };
  }, [estimatedLiquidationPrice, tradeUsdAmount, marginUsage]);

  const handleMidClick = () => {
    setTriggerPrice(formatTpOrSlPrice(midPrice, szDecimals));
  };

  useEffect(() => {
    const handleClickPrice = (price: string) => {
      setTriggerPrice(price.toString());
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

  const handleTriggerPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (validatePriceInput(value, szDecimals)) {
      setTriggerPrice(value);
    }
  };

  return (
    <div className="space-y-[16px]">
      <OrderSideAndFunds
        orderSide={orderSide}
        switchOrderSide={switchOrderSide}
        availableBalance={availableBalance}
        currentPosition={currentPosition}
        selectedCoin={selectedCoin}
      />

      <div className="flex items-center gap-8">
        <div className="relative flex-1">
          <input
            type="text"
            value={triggerPrice}
            onChange={handleTriggerPriceChange}
            placeholder=""
            className="w-full h-[40px] pl-[44px] pr-[40px] rounded-[8px] bg-rb-neutral-bg-1 border border-solid border-rb-neutral-line text-r-neutral-title-1 text-[13px] focus:outline-none font-medium text-right"
          />
          <div className="absolute left-[12px] top-1/2 -translate-y-1/2 text-r-neutral-foot text-[13px]">
            {t('page.perpsPro.tradingPanel.triggerPrice')}
          </div>
          <div className="absolute right-[8px] top-1/2 -translate-y-1/2 text-r-neutral-foot text-[13px]">
            USD
          </div>
        </div>
        <div
          className="w-[88px] h-[40px] flex items-center justify-center text-center bg-rb-neutral-bg-2 font-medium text-[13px] text-r-neutral-title-1 rounded-[8px] cursor-pointer"
          onClick={handleMidClick}
        >
          Mid
        </div>
      </div>

      {/* Position Size Input */}
      <PositionSizeInputAndSlider
        price={triggerPrice}
        maxTradeSize={maxTradeSize}
        positionSize={positionSize}
        setPositionSize={setPositionSize}
        percentage={percentage}
        setPercentage={setPercentage}
        baseAsset={selectedCoin}
        quoteAsset="USDC"
        precision={{ amount: szDecimals, price: pxDecimals }}
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-16">
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
      </div>

      {/* Place Order Button */}
      {needEnableTrading ? (
        <Button
          onClick={handleActionApproveStatus}
          className={
            'w-full h-[40px] rounded-[8px] font-medium text-[13px] mt-20 border-transparent bg-rb-green-default text-rb-neutral-InvertHighlight'
          }
        >
          {t('page.perpsPro.tradingPanel.enableTrading')}
        </Button>
      ) : (
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
      )}

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
