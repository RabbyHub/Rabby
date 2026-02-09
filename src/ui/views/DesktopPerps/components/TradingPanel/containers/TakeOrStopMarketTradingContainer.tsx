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
import { TradingButton } from '../components/TradingButton';

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

  useEffect(() => {
    setTriggerPrice('');
  }, [selectedCoin]);

  // Form validation
  const validation = React.useMemo(() => {
    let error: string = '';
    const tradeSize = Number(positionSize.amount) || 0;
    const notionalNum = tradeSize * Number(markPrice || 0);

    if (notionalNum === 0 || !Number(triggerPrice)) {
      return {
        isValid: false,
        error:
          reduceOnly && percentage > 0 && Number(triggerPrice)
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
    tradeSize,
    markPrice,
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
    const getExpectedPnL = (percentage: string) => {
      return Number(percentage) && Number(tradeSize) > 0
        ? (Number(percentage) * marginRequired) / 100
        : 0;
    };
    const orderValue = Number(tradeSize) * Number(markPrice);
    return {
      liquidationPrice: estimatedLiquidationPrice,
      liquidationDistance: '',
      orderValue: orderValue > 0 ? formatUsdValue(orderValue) : '$0.00',
      marginRequired: reduceOnly ? '-' : formatUsdValue(orderValue / leverage),
      marginUsage,
      slippage: undefined,
      tpExpectedPnL: 1 * getExpectedPnL(tpslConfig.takeProfit.percentage),
      slExpectedPnL: -1 * getExpectedPnL(tpslConfig.stopLoss.percentage),
    };
  }, [
    estimatedLiquidationPrice,
    leverage,
    markPrice,
    reduceOnly,
    marginUsage,
    tpslConfig.takeProfit.percentage,
    tpslConfig.stopLoss.percentage,
    tradeSize,
    marginRequired,
  ]);

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
          className="w-[88px] h-[40px] flex items-center justify-center text-center bg-rb-neutral-bg-2 font-medium text-[13px] text-r-neutral-title-1 rounded-[8px] cursor-pointer hover:border-rb-brand-default border border-solid border-transparent"
          onClick={handleMidClick}
        >
          Mid
        </div>
      </div>

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
        szDecimals={szDecimals}
        priceChangeUsdValue={true}
        reduceOnly={reduceOnly}
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-16">
          <PerpsCheckbox
            checked={reduceOnly}
            onChange={setReduceOnly}
            tooltipText={t('page.perpsPro.tradingPanel.reduceOnlyTips')}
            title={t('page.perpsPro.tradingPanel.reduceOnly')}
            disabled={!currentPosition}
          />
        </div>
      </div>

      {/* Place Order Button */}
      {
        <TradingButton
          loading={handleOpenOrderLoading}
          onClick={handleOpenOrderRequest}
          disabled={!validation.isValid || tpslConfigHasError}
          error={validation.error}
          isValid={validation.isValid}
          orderSide={orderSide}
          titleText={t('page.perpsPro.tradingPanel.placeOrder')}
        />
      }

      {/* Order Summary */}
      <OrderSummary data={orderSummary} />
    </div>
  );
};
