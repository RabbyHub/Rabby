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

export const TWAPTradingContainer: React.FC<TradingContainerProps> = () => {
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
  const [hourInput, setHourInput] = React.useState('');
  const [minuteInput, setMinuteInput] = React.useState('');
  const [randomize, setRandomize] = React.useState(false);

  const allMinsDuration = React.useMemo(() => {
    return Number(hourInput) * 60 + Number(minuteInput);
  }, [hourInput, minuteInput]);

  const { numberOfOrders, sizePerSuborder } = React.useMemo(() => {
    const numberOfOrders = Math.floor((allMinsDuration * 60) / 30);
    const sizePerSuborder = Number(tradeSize) / numberOfOrders;
    return {
      numberOfOrders,
      sizePerSuborder: sizePerSuborder.toFixed(szDecimals),
    };
  }, [allMinsDuration, tradeSize, szDecimals]);

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

    if (Number(sizePerSuborder) * Number(midPrice) < 10) {
      error = t('page.perpsPro.tradingPanel.minimumSuborderSize');
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
    percentage,
    tradeSize,
    marginRequired,
    availableBalance,
    currentMarketData,
    sizePerSuborder,
    midPrice,
    t,
  ]);

  const { handleOpenTWAPOrder } = usePerpsProPosition();

  const {
    run: handleOpenOrderRequest,
    loading: handleOpenOrderLoading,
  } = useRequest(
    async () => {
      await handleOpenTWAPOrder({
        coin: selectedCoin,
        isBuy: orderSide === OrderSide.BUY,
        size: tradeSize,
        reduceOnly,
        durationMins: allMinsDuration,
        randomizeDelay: randomize,
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
      slippage: '0.08%',
    };
  }, [estimatedLiquidationPrice, tradeUsdAmount, marginUsage]);

  const validateNumberInput = (value: string) => {
    return /^[0-9]*$/.test(value);
  };

  const handleHourInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (validateNumberInput(value)) {
      setHourInput(value);
    }
  };

  const handleMinuteInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (validatePriceInput(value, szDecimals)) {
      setMinuteInput(value);
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

      {/* Position Size Input */}
      <PositionSizeInputAndSlider
        price={midPrice}
        maxTradeSize={maxTradeSize}
        positionSize={positionSize}
        setPositionSize={setPositionSize}
        percentage={percentage}
        setPercentage={setPercentage}
        baseAsset={selectedCoin}
        quoteAsset="USDC"
        precision={{ amount: szDecimals, price: pxDecimals }}
      />

      <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <div className="text-rb-neutral-foot font-medium text-[12px]">
            {t('page.perpsPro.tradingPanel.runtime')}
          </div>
          <div className="text-rb-neutral-title-1 text-[12px] font-medium">
            {t('page.perpsPro.tradingPanel.runtimeTips')}
          </div>
        </div>
        <div className="flex items-center gap-[8px]">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                value={hourInput}
                onChange={handleHourInputChange}
                placeholder=""
                className={clsx(
                  'w-full h-[40px] pl-[32px] pr-[12px] rounded-[8px] bg-rb-neutral-bg-1 border border-solid text-[13px] focus:outline-none font-medium text-right',
                  hourInput.length > 0 && !validateNumberInput(hourInput)
                    ? 'border-rb-red-default text-rb-red-default'
                    : 'border-rb-neutral-line text-r-neutral-title-1'
                )}
              />
              <div className="absolute left-[12px] top-1/2 -translate-y-1/2 text-r-neutral-foot text-[13px]">
                {t('page.perpsPro.tradingPanel.hours')}
              </div>
            </div>
          </div>
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                value={minuteInput}
                onChange={handleMinuteInputChange}
                placeholder=""
                className={clsx(
                  'w-full h-[40px] pl-[32px] pr-[12px] rounded-[8px] bg-rb-neutral-bg-1 border border-solid text-[13px] focus:outline-none font-medium text-right',
                  minuteInput.length > 0 && !validateNumberInput(minuteInput)
                    ? 'border-rb-red-default text-rb-red-default'
                    : 'border-rb-neutral-line text-r-neutral-title-1'
                )}
              />
              <div className="absolute left-[12px] top-1/2 -translate-y-1/2 text-r-neutral-foot text-[13px]">
                {t('page.perpsPro.tradingPanel.minutes')}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-16">
          <label className="flex items-center gap-[8px] cursor-pointer">
            <input
              type="checkbox"
              checked={randomize}
              onChange={(e) => setRandomize(e.target.checked)}
              className="w-[16px] h-[16px] rounded-[4px] accent-blue-600 cursor-pointer"
            />
            <span className="text-r-neutral-title-1 text-[13px]">
              {t('page.perpsPro.tradingPanel.randomize')}
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
      </div>

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
      <div className="space-y-[6px] font-medium">
        <div className="flex items-center justify-between">
          <span className="text-r-neutral-foot text-[13px]">
            {t('page.perpsPro.tradingPanel.frequency')}
          </span>
          <span className="text-r-neutral-title-1 text-[13px]">
            {'30 seconds'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-r-neutral-foot text-[13px]">
            {t('page.perpsPro.tradingPanel.runtime')}
          </span>
          <span className="text-r-neutral-title-1 text-[13px]">
            {`${
              Math.floor(allMinsDuration / 60) >= 1
                ? Math.floor(allMinsDuration / 60) + ' hours'
                : ''
            } ${Math.floor(allMinsDuration % 60)} minutes`}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-r-neutral-foot text-[13px]">
            {t('page.perpsPro.tradingPanel.numberOfOrders')}
          </span>
          <span className="text-r-neutral-title-1 text-[13px]">
            {numberOfOrders}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-r-neutral-foot text-[13px]">
            {t('page.perpsPro.tradingPanel.sizePerSuborder')}
          </span>
          <span className="text-r-neutral-title-1 text-[13px]">
            {sizePerSuborder}
          </span>
        </div>

        {/* Margin Required */}
        <div className="flex items-center justify-between">
          <span className="text-r-neutral-foot text-[13px]">
            {t('page.perpsPro.tradingPanel.marginRequired')}
          </span>
          <span className="text-r-neutral-title-1 text-[13px]">
            {orderSummary.marginRequired}
          </span>
        </div>

        {/* Margin Usage */}
        <div className="flex items-center justify-between">
          <span className="text-r-neutral-foot text-[13px]">
            {t('page.perpsPro.tradingPanel.marginUsage')}
          </span>
          <span className="text-r-neutral-title-1 text-[13px]">
            {orderSummary.marginUsage}
          </span>
        </div>
      </div>
    </div>
  );
};
