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
import { Button, Menu, message, Tooltip, Dropdown } from 'antd';
import clsx from 'clsx';
import { OrderSideAndFunds } from '../components/OrderSideAndFunds';
import { PositionSizeInputAndSlider } from '../components/PositionSizeInputAndSlider';
import { usePerpsTradingState } from '../../../hooks/usePerpsTradingState';
import { formatPercent, validatePriceInput } from '@/ui/views/Perps/utils';
import { formatTpOrSlPrice } from '@/ui/views/Perps/utils';
import { calculateMaxScaleTotalSize } from '../utils';
import eventBus from '@/eventBus';
import { EVENTS } from '@/constant';
import { RcIconArrowDownCC } from '@/ui/assets/desktop/common';
import { PerpsCheckbox } from '../components/PerpsCheckbox';
import { DesktopPerpsInput } from '../../DesktopPerpsInput';
import { TradingButton } from '../components/TradingButton';
import { BigNumber } from 'bignumber.js';

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
      return {
        isValid: false,
        error:
          reduceOnly && percentage > 0
            ? t('page.perpsPro.tradingPanel.reduceOnlyTooLarge')
            : '',
      };
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

    const scaleOrdersValue = scaleOrders.reduce((acc, order) => {
      return acc + Number(order.sz) * Number(order.limitPx);
    }, 0);

    const marginRequired = scaleOrdersValue / leverage;
    return {
      start: `${startOrderSize} ${selectedCoin} @ ${splitNumberByStep(
        startPrice || '0'
      )} USDC`,
      end: `${endOrderSize} ${selectedCoin} @ ${splitNumberByStep(
        endPrice || '0'
      )} USDC`,
      orderValue:
        scaleOrdersValue > 0 ? formatUsdValue(scaleOrdersValue) : '$0.00',
      marginRequired: formatUsdValue(marginRequired),
      marginUsage: formatPercent(marginRequired / availableBalance, 1),
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

  const limitOrderTypeOptions = [
    {
      label: 'GTC',
      value: 'Gtc',
      title: t('page.perpsPro.tradingPanel.limitOrderTypeOptions.Gtc'),
    },
    {
      label: 'IOC',
      value: 'Ioc',
      title: t('page.perpsPro.tradingPanel.limitOrderTypeOptions.Ioc'),
    },
    {
      label: 'ALO',
      value: 'Alo',
      title: t('page.perpsPro.tradingPanel.limitOrderTypeOptions.Alo'),
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
        price={markPrice}
        maxTradeSize={scaleMaxTradeSize}
        positionSize={positionSize}
        setPositionSize={setPositionSize}
        percentage={percentage}
        setPercentage={setPercentage}
        baseAsset={selectedCoin}
        quoteAsset="USDC"
        szDecimals={szDecimals}
        reduceOnly={reduceOnly}
      />

      <div className="space-y-[8px]">
        <div className="flex items-center gap-8">
          <DesktopPerpsInput
            value={startPrice}
            onChange={handleStartPriceChange}
            className="text-right text-[13px] leading-[16px]"
            suffix={
              <span className="text-[13px] leading-[16px] font-medium text-rb-neutral-foot">
                USD
              </span>
            }
            prefix={
              <span className="text-[13px] leading-[16px] font-medium text-rb-neutral-foot">
                {t('page.perpsPro.tradingPanel.startPrice')}
              </span>
            }
          />
          <div
            className="w-[88px] h-[40px] flex items-center justify-center text-center bg-rb-neutral-bg-2 font-medium text-[13px] text-r-neutral-title-1 rounded-[8px] cursor-pointer hover:border-rb-brand-default border border-solid border-transparent"
            onClick={handleStartMidClick}
          >
            Mid
          </div>
        </div>

        <div className="flex items-center gap-8">
          <DesktopPerpsInput
            value={endPrice}
            onChange={handleEndPriceChange}
            className="text-right text-[13px] leading-[16px]"
            suffix={
              <span className="text-[13px] leading-[16px] font-medium text-rb-neutral-foot">
                USD
              </span>
            }
            prefix={
              <span className="text-[13px] leading-[16px] font-medium text-rb-neutral-foot">
                {t('page.perpsPro.tradingPanel.endPrice')}
              </span>
            }
          />
          <div
            className="w-[88px] h-[40px] flex items-center justify-center text-center bg-rb-neutral-bg-2 font-medium text-[13px] text-r-neutral-title-1 rounded-[8px] cursor-pointer hover:border-rb-brand-default border border-solid border-transparent"
            onClick={handleEndMidClick}
          >
            Mid
          </div>
        </div>

        <div className="flex items-center gap-[8px]">
          <DesktopPerpsInput
            value={numGrids}
            onChange={handleNumGridsChange}
            className="flex-1 text-right text-[13px] leading-[16px]"
            prefix={
              <span className="text-[13px] leading-[16px] font-medium text-rb-neutral-foot">
                {t('page.perpsPro.tradingPanel.totalOrders')}
              </span>
            }
          />
          <Tooltip
            placement="top"
            overlayClassName={clsx('rectangle')}
            title={t('page.perpsPro.tradingPanel.sizeSkewTooltip')}
          >
            <DesktopPerpsInput
              value={sizeSkew}
              onChange={handleSizeSkewChange}
              className="flex-1 text-right text-[13px] leading-[16px]"
              prefix={
                <span className="text-[13px] leading-[16px] font-medium text-rb-neutral-foot">
                  {t('page.perpsPro.tradingPanel.sizeSkew')}
                </span>
              }
            />
          </Tooltip>
        </div>
      </div>

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
        <div className="flex items-center gap-4">
          <Dropdown
            transitionName=""
            forceRender={true}
            overlay={
              <Menu
                className="bg-r-neutral-bg1 border border-r-neutral-line"
                onClick={(info) =>
                  setLimitOrderType(info.key as LimitOrderType)
                }
              >
                {limitOrderTypeOptions.map((option) => (
                  <Menu.Item
                    className="text-r-neutral-title1 hover:bg-r-blue-light1"
                    key={option.value}
                  >
                    <Tooltip key={option.value} title={option.title}>
                      {option.label}
                    </Tooltip>
                  </Menu.Item>
                ))}
              </Menu>
            }
          >
            <button
              type="button"
              className={clsx(
                'inline-flex items-center justify-between',
                'px-[8px] py-[8px] flex-1 w-[80px] h-28',
                'border border-rb-neutral-line rounded-[6px]',
                'text-[12px] leading-[14px] font-medium text-rb-neutral-title-1 hover:border-rb-brand-default'
              )}
            >
              {
                limitOrderTypeOptions.find(
                  (option) => option.value === limitOrderType
                )?.label
              }
              <RcIconArrowDownCC className="text-rb-neutral-secondary" />
            </button>
          </Dropdown>
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
        <TradingButton
          loading={handleOpenOrderLoading}
          onClick={handleOpenOrderRequest}
          disabled={!validation.isValid}
          error={validation.error}
          isValid={validation.isValid}
          orderSide={orderSide}
          titleText={t('page.perpsPro.tradingPanel.placeOrder')}
        />
      )}

      {/* Order Summary */}
      <div className="space-y-[6px]">
        <div className="flex items-center justify-between">
          <span className="text-r-neutral-foot text-[13px]">
            {t('page.perpsPro.tradingPanel.start')}
          </span>
          <span className="text-r-neutral-title-1 font-medium text-[13px]">
            {orderSummary.start}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-r-neutral-foot text-[13px]">
            {t('page.perpsPro.tradingPanel.end')}
          </span>
          <span className="text-r-neutral-title-1 font-medium text-[13px]">
            {orderSummary.end}
          </span>
        </div>

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
            {t('page.perpsPro.tradingPanel.marginRequired')}
          </span>
          <span className="text-r-neutral-title-1 font-medium text-[13px]">
            {reduceOnly ? '-' : orderSummary.marginRequired}
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
