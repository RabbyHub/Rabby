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
import { usePerpsProPosition } from '../../../hooks/usePerpsProPosition';
import { useRequest } from 'ahooks';
import { message, Tooltip } from 'antd';
import clsx from 'clsx';
import { OrderSideAndFunds } from '../components/OrderSideAndFunds';
import { LimitOrderTypeSelector } from '../components/LimitOrderTypeSelector';
import { usePerpsTradingState } from '../../../hooks/usePerpsTradingState';
import { formatPercent, validatePriceInput } from '@/ui/views/Perps/utils';
import { formatTpOrSlPrice } from '@/ui/views/Perps/utils';
import { calculateMaxScaleTotalSize } from '../utils';
import eventBus from '@/eventBus';
import { EVENTS } from '@/constant';

import { PerpsCheckbox } from '../components/PerpsCheckbox';
import { DesktopPerpsInputV2 as DesktopPerpsInput } from '../../DesktopPerpsInputV2';
import { TradingButton } from '../components/TradingButton';
import { BigNumber } from 'bignumber.js';
import stats from '@/stats';
import { getStatsReportSide } from '../../../utils';

export const ScaleTradingContainer: React.FC<TradingContainerProps> = () => {
  const { t } = useTranslation();

  // Scale keeps its own orderSide state (excluded from redesign)
  const [orderSide, setOrderSide] = React.useState<OrderSide>(OrderSide.BUY);
  const switchOrderSide = React.useCallback((side: OrderSide) => {
    setOrderSide(side);
  }, []);

  // Get data from perpsState
  const {
    currentPerpsAccount,
    selectedCoin,
    positionSize,
    setPositionSize,
    currentPosition,
    markPrice,
    midPrice,
    szDecimals,
    quoteAsset,
    pxDecimals,
    leverage,
    leverageType,
    availableBalance,
    reduceOnly,
    setReduceOnly,
    tradeUsdAmount,
    marginRequired,
    tradeSize,
    maxBuyTradeSize,
    maxSellTradeSize,
    marginUsage,
    currentMarketData,
    percentage,
    setPercentage,
    sizeDisplayUnit,
    setSizeDisplayUnit,
    resetForm,
  } = usePerpsTradingState();

  const maxTradeSize =
    orderSide === OrderSide.BUY ? maxBuyTradeSize : maxSellTradeSize;
  const [startPrice, setStartPrice] = React.useState('');
  const [endPrice, setEndPrice] = React.useState('');
  const [numGrids, setNumGrids] = React.useState('5');
  const [sizeSkew, setSizeSkew] = React.useState('1.00');
  const [limitOrderType, setLimitOrderType] = React.useState<LimitOrderType>(
    'Gtc'
  );

  useEffect(() => {
    setStartPrice('');
    setEndPrice('');
    setNumGrids('5');
    setSizeSkew('1.00');
  }, [selectedCoin]);

  // Calculate maxTradeSize for scale orders based on scale parameters
  const scaleMaxTradeSize = React.useMemo(() => {
    if (
      !startPrice ||
      !endPrice ||
      !numGrids ||
      Number(numGrids) <= 1 ||
      !sizeSkew ||
      Number(sizeSkew) <= 0 ||
      !availableBalance ||
      !leverage ||
      reduceOnly
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
    reduceOnly,
    startPrice,
    endPrice,
    numGrids,
    sizeSkew,
    availableBalance,
    leverage,
    szDecimals,
    maxTradeSize,
  ]);

  const {
    handleOpenScaleOrder,
    calculateScaleOrdersWithSkew,
    needEnableTrading,
    handleActionApproveStatus,
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
      console.error(error);
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

  const scaleAveragePrice = React.useMemo(() => {
    if (!startPrice || !endPrice) {
      return midPrice;
    }
    const sizeSkewBN = new BigNumber(sizeSkew);
    if (sizeSkewBN.isEqualTo(1)) {
      return (Number(startPrice) + Number(endPrice)) / 2;
    } else {
      const totalNotional = scaleOrders.reduce((acc, order) => {
        return acc + Number(order.sz) * Number(order.limitPx);
      }, 0);
      const totalSize = scaleOrders.reduce((acc, order) => {
        return acc + Number(order.sz);
      }, 0);
      const averagePrice = totalNotional / totalSize;
      return averagePrice;
    }
  }, [startPrice, endPrice, scaleOrders, midPrice]);

  // Form validation
  const validation = React.useMemo(() => {
    let error: string = '';
    const notionalNum = Number(positionSize.notionalValue) || 0;
    const tradeSize = Number(positionSize.amount) || 0;

    if (notionalNum === 0) {
      return { isValid: false, error: '' };
    }

    if (scaleOrders.length === 1 || Number(numGrids) <= 0) {
      error = t('page.perpsPro.tradingPanel.atLeastTwoOrders');
      return { isValid: false, error };
    }

    // Check minimum order size ($10)
    const someOrderSizeIsLessThan10 = scaleOrders.some(
      (order) => Number(order.sz) * Number(order.limitPx) < 10
    );
    if (someOrderSizeIsLessThan10) {
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
    numGrids,
    scaleOrders,
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
      const isBuy = orderSide === OrderSide.BUY;
      await handleOpenScaleOrder({
        coin: selectedCoin,
        isBuy,
        totalSize: tradeSize,
        orders: scaleOrders,
      });
      stats.report('perpsTradeHistory', {
        created_at: new Date().getTime(),
        user_addr: currentPerpsAccount?.address || '',
        trade_type: 'scale',
        leverage: leverage.toString(),
        trade_side: getStatsReportSide(isBuy, reduceOnly),
        margin_mode: leverageType === 'cross' ? 'cross' : 'isolated',
        coin: selectedCoin,
        size: tradeSize,
        price: scaleAveragePrice,
        trade_usd_value: new BigNumber(scaleAveragePrice)
          .times(tradeSize)
          .toFixed(2),
        service_provider: 'hyperliquid',
        app_version: process.env.release || '0',
        address_type: currentPerpsAccount?.type || '',
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

    const scaleOrdersValue = scaleOrders.reduce((acc, order) => {
      return acc + Number(order.sz) * Number(order.limitPx);
    }, 0);

    const marginRequired = scaleOrdersValue / leverage;
    return {
      start: `${startOrderSize} ${selectedCoin} @ ${splitNumberByStep(
        startPrice || '0'
      )} USD`,
      end: `${endOrderSize} ${selectedCoin} @ ${splitNumberByStep(
        endPrice || '0'
      )} USD`,
      orderValue:
        scaleOrdersValue > 0 ? formatUsdValue(scaleOrdersValue) : '$0.00',
      marginRequired: formatUsdValue(marginRequired),
      marginUsage: `${formatUsdValue(marginRequired)} (${formatPercent(
        marginRequired / availableBalance,
        1
      )})`,
    };
  }, [
    scaleOrders,
    leverage,
    marginRequired,
    availableBalance,
    marginUsage,
    selectedCoin,
    startPrice,
    endPrice,
    scaleOrders,
  ]);

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
      if (Number(value) > 100) {
        setNumGrids('100');
        return;
      }
      setNumGrids(value);
    }
  };

  const validateSizeSkewInput = (value: string) => {
    if (value === '') {
      return true;
    }
    // 0.01 - 100.00，限制两位小数，最大100，不允许负号输入
    return /^(100(\.00?)?|(\d{1,2})(\.\d{0,2})?)$/.test(value);
  };

  const handleSizeSkewChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (validateSizeSkewInput(value)) {
      setSizeSkew(value);
    }
  };

  return (
    <div className="space-y-[10px]">
      <OrderSideAndFunds
        availableBalance={availableBalance}
        quoteAsset={quoteAsset}
      />

      <div className="flex flex-col gap-[6px]">
        <span className="text-rb-neutral-secondary text-[12px]">
          {t('page.perpsPro.tradingPanel.startPrice')}
        </span>
        <DesktopPerpsInput
          value={startPrice}
          onChange={handleStartPriceChange}
          className="text-left"
          suffix={
            <span className="text-15 font-medium text-rb-neutral-title-1">
              {quoteAsset}
            </span>
          }
        />
      </div>

      <div className="flex flex-col gap-[6px]">
        <span className="text-rb-neutral-secondary text-[12px]">
          {t('page.perpsPro.tradingPanel.endPrice')}
        </span>
        <DesktopPerpsInput
          value={endPrice}
          onChange={handleEndPriceChange}
          className="text-left"
          suffix={
            <span className="text-15 font-medium text-rb-neutral-title-1">
              {quoteAsset}
            </span>
          }
        />
      </div>

      <div className="flex flex-col gap-[6px]">
        <span className="text-rb-neutral-secondary text-[12px]">
          {t('page.perpsPro.tradingPanel.size')}
        </span>
        <DesktopPerpsInput
          value={positionSize.amount}
          onChange={(e) => {
            const val = e.target.value;
            if (/^[0-9]*\.?[0-9]*$/.test(val)) {
              const notionalValue =
                val && markPrice ? (Number(val) * markPrice).toFixed(2) : '';
              setPositionSize({
                amount: val,
                notionalValue,
                inputSource: 'amount',
              });
            }
          }}
          className="text-left"
          suffix={
            <span className="text-15 font-medium text-rb-neutral-title-1">
              {selectedCoin}
            </span>
          }
        />
      </div>

      <div className="flex flex-col gap-[6px]">
        <span className="text-rb-neutral-secondary text-[12px]">
          {t('page.perpsPro.tradingPanel.orderCount')}
        </span>
        <DesktopPerpsInput
          value={numGrids}
          onChange={handleNumGridsChange}
          className="text-left"
        />
      </div>

      <div className="flex flex-col gap-[6px]">
        <Tooltip
          placement="topLeft"
          overlayClassName={clsx('rectangle')}
          title={t('page.perpsPro.tradingPanel.sizeSkewTooltip')}
        >
          <span className="text-rb-neutral-secondary text-[12px] cursor-help">
            {t('page.perpsPro.tradingPanel.sizeSkew')}
          </span>
        </Tooltip>
        <DesktopPerpsInput
          value={sizeSkew}
          onChange={handleSizeSkewChange}
          className="text-left"
        />
      </div>

      {/* Action Radio */}
      <div className="flex flex-col gap-[6px]">
        <span className="text-rb-neutral-secondary text-[12px]">
          {t('page.perpsPro.tradingPanel.action')}
        </span>
        <div className="flex items-center gap-[16px]">
          <PerpsCheckbox
            variant="radio"
            checked={orderSide === OrderSide.BUY}
            onChange={() => switchOrderSide(OrderSide.BUY)}
            title={t('page.perpsPro.tradingPanel.Buy')}
          />
          <PerpsCheckbox
            variant="radio"
            checked={orderSide === OrderSide.SELL}
            onChange={() => switchOrderSide(OrderSide.SELL)}
            title={t('page.perpsPro.tradingPanel.Sell')}
          />
        </div>
      </div>

      {/* Reduce Only + TIF */}
      <div className="flex items-center justify-between">
        <PerpsCheckbox
          checked={reduceOnly}
          onChange={setReduceOnly}
          tooltipText={t('page.perpsPro.tradingPanel.reduceOnlyTips')}
          title={t('page.perpsPro.tradingPanel.reduceOnly')}
          disabled={!currentPosition}
        />
        <LimitOrderTypeSelector
          value={limitOrderType}
          onChange={setLimitOrderType}
        />
      </div>

      {/* Place Order Button — always primary blue */}
      <TradingButton
        loading={handleOpenOrderLoading}
        onClick={handleOpenOrderRequest}
        disabled={!validation.isValid}
        error={validation.error}
        isValid={validation.isValid}
        orderSide={orderSide}
        titleText={t('page.perpsPro.tradingPanel.placeOrder')}
      />

      {/* Order Summary */}
      <div className="space-y-[6px]">
        <div className="flex items-center justify-between">
          <span className="text-r-neutral-foot text-[13px]">
            {t('page.perpsPro.tradingPanel.orderValue')}
          </span>
          <span className="text-r-neutral-title-1 font-medium text-[13px]">
            {orderSummary.orderValue}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-r-neutral-foot text-[13px]">
            {t('page.perpsPro.tradingPanel.marginUsage')}
          </span>
          <span className="text-r-neutral-title-1 font-medium text-[13px]">
            {orderSummary.marginUsage}
          </span>
        </div>
      </div>
    </div>
  );
};
