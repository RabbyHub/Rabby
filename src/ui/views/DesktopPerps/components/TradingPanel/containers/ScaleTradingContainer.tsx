import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useRabbySelector } from '@/ui/store';
import { formatUsdValue, splitNumberByStep } from '@/ui/utils';
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
import { Button, message, Select } from 'antd';
import clsx from 'clsx';
import { OrderSideAndFunds } from '../components/OrderSideAndFunds';
import { PositionSizeInputAndSlider } from '../components/PositionSizeInputAndSlider';
import { usePerpsTradingState } from '../../../hooks/usePerpsTradingState';
import { validatePriceInput } from '@/ui/views/Perps/utils';
import { formatTpOrSlPrice } from '@/ui/views/Perps/utils';
import { calculateMaxScaleTotalSize } from '../utils';
import eventBus from '@/eventBus';
import { EVENTS } from '@/constant';

export const ScaleTradingContainer: React.FC<TradingContainerProps> = () => {
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
    currentBestAskPrice,
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
  const [startPrice, setStartPrice] = React.useState('');
  const [endPrice, setEndPrice] = React.useState('');
  const [numGrids, setNumGrids] = React.useState('5');
  const [sizeSkew, setSizeSkew] = React.useState('1.00');
  const [limitOrderType, setLimitOrderType] = React.useState<LimitOrderType>(
    'Gtc'
  );

  // Calculate maxTradeSize for scale orders based on scale parameters
  const scaleMaxTradeSize = React.useMemo(() => {
    if (
      !startPrice ||
      !endPrice ||
      !numGrids ||
      Number(numGrids) <= 0 ||
      !sizeSkew ||
      Number(sizeSkew) <= 0 ||
      !availableBalance ||
      !leverage
    ) {
      return maxTradeSize;
    }

    const calculatedMaxSize = calculateMaxScaleTotalSize(
      availableBalance,
      leverage,
      startPrice,
      endPrice,
      Number(numGrids),
      Number(sizeSkew),
      szDecimals
    );

    return calculatedMaxSize;
  }, [
    startPrice,
    endPrice,
    numGrids,
    sizeSkew,
    availableBalance,
    leverage,
    szDecimals,
    maxTradeSize,
  ]);

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

    if (startPrice && endPrice && Number(startPrice) === Number(endPrice)) {
      error = t('page.perpsPro.tradingPanel.startAndEndPriceMustBeDifferent');
      return { isValid: false, error };
    }

    if (scaleMaxTradeSize && tradeSize > Number(scaleMaxTradeSize)) {
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
    scaleMaxTradeSize,
    reduceOnly,
    limitOrderType,
    percentage,
    tradeSize,
    marginRequired,
    availableBalance,
    currentMarketData,
    startPrice,
    endPrice,
    t,
  ]);

  const {
    handleOpenScaleOrder,
    calculateScaleOrdersWithSkew,
  } = usePerpsProPosition();

  const scaleOrders = useMemo(() => {
    try {
      return calculateScaleOrdersWithSkew({
        coin: selectedCoin,
        szDecimals,
        isBuy: orderSide === OrderSide.BUY,
        totalSize: tradeSize,
        startPrice,
        endPrice,
        sizeSkew: Number(sizeSkew),
        numGrids: Number(numGrids),
        reduceOnly,
        limitOrderType,
      });
    } catch (error) {
      return [];
    }
  }, [
    selectedCoin,
    orderSide,
    tradeSize,
    startPrice,
    endPrice,
    numGrids,
    sizeSkew,
    szDecimals,
    limitOrderType,
    reduceOnly,
  ]);

  const {
    run: handleOpenOrderRequest,
    loading: handleOpenOrderLoading,
  } = useRequest(
    async () => {
      if (scaleOrders.length === 0) {
        message.error({
          duration: 1.5,
          content: 'No scale orders to open',
        });
        return;
      }
      await handleOpenScaleOrder({
        coin: selectedCoin,
        isBuy: orderSide === OrderSide.BUY,
        totalSize: tradeSize,
        orders: scaleOrders,
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

  const orderSummary = React.useMemo(() => {
    const startOrderSize = scaleOrders[0]?.sz || '0';
    const endOrderSize = scaleOrders[scaleOrders.length - 1]?.sz || '0';

    return {
      start: `${startOrderSize} ${selectedCoin} @ ${splitNumberByStep(
        startPrice || '0'
      )} USDC`,
      end: `${endOrderSize} ${selectedCoin} @ ${splitNumberByStep(
        endPrice || '0'
      )} USDC`,
      orderValue: tradeUsdAmount > 0 ? formatUsdValue(tradeUsdAmount) : '$0.00',
      marginRequired: formatUsdValue(marginRequired),
      marginUsage: marginUsage,
    };
  }, [
    tradeUsdAmount,
    marginRequired,
    marginUsage,
    selectedCoin,
    startPrice,
    endPrice,
    scaleOrders,
  ]);

  const limitOrderTypeOptions = [
    {
      label: 'GTC',
      value: 'Gtc',
      title: t('page.perpsPro.tradingPanel.limitOrderTypeOptions.Gtc'),
    },
    {
      label: 'ALO',
      value: 'Alo',
      title: t('page.perpsPro.tradingPanel.limitOrderTypeOptions.Alo'),
    },
    {
      label: 'IOC',
      value: 'Ioc',
      title: t('page.perpsPro.tradingPanel.limitOrderTypeOptions.Ioc'),
    },
  ];

  const handleStartMidClick = () => {
    setStartPrice(formatTpOrSlPrice(midPrice, szDecimals));
  };
  const handleEndMidClick = () => {
    setEndPrice(formatTpOrSlPrice(midPrice, szDecimals));
  };

  // useEffect(() => {
  //   const handleClickPrice = (price: string) => {
  //     setLimitPrice(price.toString());
  //   };
  //   eventBus.addEventListener(
  //     EVENTS.PERPS.HANDLE_CLICK_PRICE,
  //     handleClickPrice
  //   );

  //   return () => {
  //     eventBus.removeEventListener(
  //       EVENTS.PERPS.HANDLE_CLICK_PRICE,
  //       handleClickPrice
  //     );
  //   };
  // }, []);

  const handleStartPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (validatePriceInput(value, szDecimals)) {
      setStartPrice(value);
    }
  };

  const handleEndPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (validatePriceInput(value, szDecimals)) {
      setEndPrice(value);
    }
  };

  const validateNumberInput = (value: string) => {
    return /^[0-9]*$/.test(value);
  };

  const handleNumGridsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (validateNumberInput(value)) {
      setNumGrids(value);
    }
  };

  const validateSizeSkewInput = (value: string) => {
    return /^[0-9.]*$/.test(value);
  };

  const handleSizeSkewChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (validateSizeSkewInput(value)) {
      setSizeSkew(value);
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
        maxTradeSize={scaleMaxTradeSize}
        positionSize={positionSize}
        setPositionSize={setPositionSize}
        percentage={percentage}
        setPercentage={setPercentage}
        baseAsset={selectedCoin}
        quoteAsset="USDC"
        precision={{ amount: szDecimals, price: pxDecimals }}
      />

      <div className="flex items-center gap-8">
        <div className="relative flex-1">
          <input
            type="text"
            value={startPrice}
            onChange={handleStartPriceChange}
            placeholder=""
            className="w-full h-[40px] pl-[44px] pr-[40px] rounded-[8px] bg-rb-neutral-bg-1 border border-solid border-rb-neutral-line text-r-neutral-title-1 text-[13px] focus:outline-none font-medium text-right"
          />
          <div className="absolute left-[12px] top-1/2 -translate-y-1/2 text-r-neutral-foot text-[13px]">
            {t('page.perpsPro.tradingPanel.startPrice')}
          </div>
          <div className="absolute right-[8px] top-1/2 -translate-y-1/2 text-r-neutral-foot text-[13px]">
            USD
          </div>
        </div>
        <div
          className="w-[88px] h-[40px] flex items-center justify-center text-center bg-rb-neutral-bg-2 font-medium text-[13px] text-r-neutral-title-1 rounded-[8px] cursor-pointer"
          onClick={handleStartMidClick}
        >
          Mid
        </div>
      </div>

      <div className="flex items-center gap-8">
        <div className="relative flex-1">
          <input
            type="text"
            value={endPrice}
            onChange={handleEndPriceChange}
            placeholder=""
            className="w-full h-[40px] pl-[44px] pr-[40px] rounded-[8px] bg-rb-neutral-bg-1 border border-solid border-rb-neutral-line text-r-neutral-title-1 text-[13px] focus:outline-none font-medium text-right"
          />
          <div className="absolute left-[12px] top-1/2 -translate-y-1/2 text-r-neutral-foot text-[13px]">
            {t('page.perpsPro.tradingPanel.endPrice')}
          </div>
          <div className="absolute right-[8px] top-1/2 -translate-y-1/2 text-r-neutral-foot text-[13px]">
            USD
          </div>
        </div>
        <div
          className="w-[88px] h-[40px] flex items-center justify-center text-center bg-rb-neutral-bg-2 font-medium text-[13px] text-r-neutral-title-1 rounded-[8px] cursor-pointer"
          onClick={handleEndMidClick}
        >
          Mid
        </div>
      </div>

      <div className="flex items-center gap-[8px]">
        <div className="flex-1">
          <div className="relative">
            <input
              type="text"
              value={numGrids}
              onChange={handleNumGridsChange}
              placeholder=""
              className={clsx(
                'w-full h-[40px] pl-[32px] pr-[12px] rounded-[8px] bg-rb-neutral-bg-1 border border-solid text-[13px] focus:outline-none font-medium text-right',
                Number(numGrids) > 0 && !validateNumberInput(numGrids)
                  ? 'border-rb-red-default text-rb-red-default'
                  : 'border-rb-neutral-line text-r-neutral-title-1'
              )}
            />
            <div className="absolute left-[12px] top-1/2 -translate-y-1/2 text-r-neutral-foot text-[13px]">
              {t('page.perpsPro.tradingPanel.totalOrders')}
            </div>
          </div>
        </div>
        <div className="flex-1">
          <div className="relative">
            <input
              type="text"
              value={sizeSkew}
              onChange={handleSizeSkewChange}
              placeholder=""
              className={clsx(
                'w-full h-[40px] pl-[32px] pr-[12px] rounded-[8px] bg-rb-neutral-bg-1 border border-solid text-[13px] focus:outline-none font-medium text-right',
                !validateSizeSkewInput(sizeSkew)
                  ? 'border-rb-red-default text-rb-red-default'
                  : 'border-rb-neutral-line text-r-neutral-title-1'
              )}
            />
            <div className="absolute left-[12px] top-1/2 -translate-y-1/2 text-r-neutral-foot text-[13px]">
              {t('page.perpsPro.tradingPanel.sizeSkew')}
            </div>
          </div>
        </div>
      </div>

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
        <div className="flex items-center gap-4">
          <Select
            options={limitOrderTypeOptions}
            value={limitOrderType}
            onChange={(value) => setLimitOrderType(value)}
            listItemHeight={28}
          />
        </div>
      </div>

      {/* Place Order Button */}
      <Button
        loading={handleOpenOrderLoading}
        onClick={handleOpenOrderRequest}
        disabled={!validation.isValid}
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
            {t('page.perpsPro.tradingPanel.start')}
          </span>
          <span className="text-r-neutral-title-1 text-[13px]">
            {orderSummary.start}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-r-neutral-foot text-[13px]">
            {t('page.perpsPro.tradingPanel.end')}
          </span>
          <span className="text-r-neutral-title-1 text-[13px]">
            {orderSummary.end}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-r-neutral-foot text-[13px]">
            {t('page.perpsPro.tradingPanel.orderValue')}
          </span>
          <span className="text-r-neutral-title-1 text-[13px]">
            {orderSummary.orderValue}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-r-neutral-foot text-[13px]">
            {t('page.perpsPro.tradingPanel.marginRequired')}
          </span>
          <span className="text-r-neutral-title-1 text-[13px]">
            {orderSummary.marginRequired}
          </span>
        </div>

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
