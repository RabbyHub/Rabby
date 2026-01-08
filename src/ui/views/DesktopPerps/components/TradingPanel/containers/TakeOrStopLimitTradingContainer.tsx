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
import { PerpsCheckbox } from '../components/PerpsCheckbox';
import { DesktopPerpsInput } from '../../DesktopPerpsInput';

interface TakeOrStopLimitTradingContainerProps {
  takeOrStop: 'tp' | 'sl';
}

export const TakeOrStopLimitTradingContainer: React.FC<TakeOrStopLimitTradingContainerProps> = ({
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
  const [limitPrice, setLimitPrice] = React.useState(
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
    midPrice,
    takeOrStop,
    orderSide,
    triggerPrice,
    tradeSize,
    marginRequired,
    availableBalance,
    currentMarketData,
    t,
  ]);

  const {
    handleOpenTPSlLimitOrder,
    needEnableTrading,
    handleActionApproveStatus,
  } = usePerpsProPosition();

  const {
    run: handleOpenOrderRequest,
    loading: handleOpenOrderLoading,
  } = useRequest(
    async () => {
      await handleOpenTPSlLimitOrder({
        coin: selectedCoin,
        isBuy: orderSide === OrderSide.BUY,
        size: tradeSize,
        triggerPx: triggerPrice,
        limitPx: limitPrice,
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

  const handleTriggerMidClick = () => {
    setTriggerPrice(formatTpOrSlPrice(midPrice, szDecimals));
  };

  const handleLimitMidClick = () => {
    setLimitPrice(formatTpOrSlPrice(midPrice, szDecimals));
  };

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

  const handleTriggerPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (validatePriceInput(value, szDecimals)) {
      setTriggerPrice(value);
    }
  };

  const handleLimitPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (validatePriceInput(value, szDecimals)) {
      setLimitPrice(value);
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
        <DesktopPerpsInput
          value={triggerPrice}
          onChange={handleTriggerPriceChange}
          className="text-right text-[13px] leading-[16px]"
          suffix={
            <span className="text-[13px] leading-[16px] font-medium text-rb-neutral-foot">
              USD
            </span>
          }
          prefix={
            <span className="text-[13px] leading-[16px] font-medium text-rb-neutral-foot">
              {t('page.perpsPro.tradingPanel.triggerPrice')}
            </span>
          }
        />
        <div
          className="w-[88px] h-[40px] flex items-center justify-center text-center bg-rb-neutral-bg-2 font-medium text-[13px] text-r-neutral-title-1 rounded-[8px] cursor-pointer"
          onClick={handleTriggerMidClick}
        >
          Mid
        </div>
      </div>

      <div className="flex items-center gap-8">
        <DesktopPerpsInput
          value={limitPrice}
          onChange={handleLimitPriceChange}
          className="text-right text-[13px] leading-[16px]"
          suffix={
            <span className="text-[13px] leading-[16px] font-medium text-rb-neutral-foot">
              USD
            </span>
          }
          prefix={
            <span className="text-[13px] leading-[16px] font-medium text-rb-neutral-foot">
              {t('page.perpsPro.tradingPanel.limitPrice')}
            </span>
          }
        />
        <div
          className="w-[88px] h-[40px] flex items-center justify-center text-center bg-rb-neutral-bg-2 font-medium text-[13px] text-r-neutral-title-1 rounded-[8px] cursor-pointer"
          onClick={handleLimitMidClick}
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
          <PerpsCheckbox
            checked={reduceOnly}
            onChange={setReduceOnly}
            title={t('page.perpsPro.tradingPanel.reduceOnly')}
            disabled={!currentPosition}
          />
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
            : t('page.perpsPro.tradingPanel.placeOrder')}
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
