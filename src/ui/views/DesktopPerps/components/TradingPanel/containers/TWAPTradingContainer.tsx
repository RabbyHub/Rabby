import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { formatUsdValue } from '@/ui/utils';
import { OrderSide, TradingContainerProps } from '../../../types';
import { usePerpsProPosition } from '../../../hooks/usePerpsProPosition';
import { useRequest } from 'ahooks';
import { OrderSideAndFunds } from '../components/OrderSideAndFunds';
import { PositionSizeInputAndSliderV2 as PositionSizeInputAndSlider } from '../components/PositionSizeInputAndSliderV2';
import { usePerpsTradingState } from '../../../hooks/usePerpsTradingState';
import { validatePriceInput } from '@/ui/views/Perps/utils';
import { formatTpOrSlPrice } from '@/ui/views/Perps/utils';
import eventBus from '@/eventBus';
import { EVENTS } from '@/constant';
import { PerpsCheckbox } from '../components/PerpsCheckbox';
import { DesktopPerpsInputV2 as DesktopPerpsInput } from '../../DesktopPerpsInputV2';
import { TradingButtons } from '../components/TradingButtons';
import stats from '@/stats';
import { getStatsReportSide } from '../../../utils';
import { BigNumber } from 'bignumber.js';
import { calcAmountFromPercentage } from '../utils';

export const TWAPTradingContainer: React.FC<TradingContainerProps> = () => {
  const { t } = useTranslation();

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
    reduceOnlyBuyDisabled,
    reduceOnlySellDisabled,
  } = usePerpsTradingState();
  const [hourInput, setHourInput] = React.useState('0');
  const [minuteInput, setMinuteInput] = React.useState('5');
  const [randomize, setRandomize] = React.useState(false);

  const allMinsDuration = React.useMemo(() => {
    return Number(hourInput) * 60 + Number(minuteInput);
  }, [hourInput, minuteInput]);

  const { numberOfOrders, sizePerSuborder } = React.useMemo(() => {
    const numberOfOrders = Math.floor((allMinsDuration * 60) / 30) + 1;
    const sizePerSuborder = Number(tradeSize) / numberOfOrders;
    return {
      numberOfOrders,
      sizePerSuborder: Number.isNaN(sizePerSuborder)
        ? '-'
        : sizePerSuborder.toFixed(szDecimals),
    };
  }, [allMinsDuration, tradeSize, szDecimals]);

  useEffect(() => {
    setHourInput('0');
    setMinuteInput('5');
    setRandomize(false);
  }, [selectedCoin]);

  // Form validation (direction-independent parts)
  const getValidationForSide = (isBuy: boolean) => {
    let error: string = '';
    const notionalNum = Number(positionSize.notionalValue) || 0;
    const tradeSize = Number(positionSize.amount) || 0;
    const maxTradeSize = isBuy ? maxBuyTradeSize : maxSellTradeSize;

    if (notionalNum === 0) {
      return { isValid: false, error: '' };
    }

    //allMinsDuration in 5min - 24h
    if (allMinsDuration < 5) {
      error = t('page.perpsPro.tradingPanel.runtimeTooShort');
      return { isValid: false, error };
    }

    if (allMinsDuration > 24 * 60) {
      error = t('page.perpsPro.tradingPanel.runtimeTooLong');
      return { isValid: false, error };
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
      error = t('page.perpsPro.tradingPanel.insufficientBalance');
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
  };

  const buyValidation = useMemo(() => getValidationForSide(true), [
    positionSize.notionalValue,
    positionSize.amount,
    maxBuyTradeSize,
    reduceOnly,
    percentage,
    currentMarketData,
    sizePerSuborder,
    midPrice,
    allMinsDuration,
    t,
  ]);

  const sellValidation = useMemo(() => getValidationForSide(false), [
    positionSize.notionalValue,
    positionSize.amount,
    maxSellTradeSize,
    reduceOnly,
    percentage,
    currentMarketData,
    sizePerSuborder,
    midPrice,
    allMinsDuration,
    t,
  ]);

  const {
    handleOpenTWAPOrder,
    needEnableTrading,
    handleActionApproveStatus,
  } = usePerpsProPosition();

  const getDirectionTradeSize = (isBuy: boolean): string => {
    if (positionSize.inputSource === 'slider') {
      const dirMax = isBuy ? maxBuyTradeSize : maxSellTradeSize;
      return calcAmountFromPercentage(percentage, dirMax, szDecimals);
    }
    return tradeSize;
  };

  const { run: handleBuyOrder, loading: buyLoading } = useRequest(
    async () => {
      const isBuy = true;
      const directionSize = getDirectionTradeSize(isBuy);
      await handleOpenTWAPOrder({
        coin: selectedCoin,
        isBuy,
        size: directionSize,
        reduceOnly,
        durationMins: allMinsDuration,
        randomizeDelay: randomize,
      });
      stats.report('perpsTradeHistory', {
        created_at: new Date().getTime(),
        user_addr: currentPerpsAccount?.address || '',
        trade_type: 'twap',
        leverage: leverage.toString(),
        trade_side: getStatsReportSide(isBuy, reduceOnly),
        margin_mode: leverageType === 'cross' ? 'cross' : 'isolated',
        coin: selectedCoin,
        size: tradeSize,
        price: markPrice,
        trade_usd_value: new BigNumber(markPrice).times(tradeSize).toFixed(2),
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

  const { run: handleSellOrder, loading: sellLoading } = useRequest(
    async () => {
      const isBuy = false;
      const directionSize = getDirectionTradeSize(isBuy);
      await handleOpenTWAPOrder({
        coin: selectedCoin,
        isBuy,
        size: directionSize,
        reduceOnly,
        durationMins: allMinsDuration,
        randomizeDelay: randomize,
      });
      stats.report('perpsTradeHistory', {
        created_at: new Date().getTime(),
        user_addr: currentPerpsAccount?.address || '',
        trade_type: 'twap',
        leverage: leverage.toString(),
        trade_side: getStatsReportSide(isBuy, reduceOnly),
        margin_mode: leverageType === 'cross' ? 'cross' : 'isolated',
        coin: selectedCoin,
        size: tradeSize,
        price: markPrice,
        trade_usd_value: new BigNumber(markPrice).times(tradeSize).toFixed(2),
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
    if (validateNumberInput(value)) {
      setMinuteInput(value);
    }
  };

  return (
    <div className="space-y-[16px]">
      <OrderSideAndFunds availableBalance={availableBalance} />

      {/* Position Size Input */}
      <PositionSizeInputAndSlider
        price={midPrice}
        maxBuyTradeSize={maxBuyTradeSize}
        maxSellTradeSize={maxSellTradeSize}
        positionSize={positionSize}
        setPositionSize={setPositionSize}
        percentage={percentage}
        setPercentage={setPercentage}
        baseAsset={selectedCoin}
        szDecimals={szDecimals}
        sizeDisplayUnit={sizeDisplayUnit}
        onUnitChange={setSizeDisplayUnit}
        reduceOnly={reduceOnly}
      />

      <div className="h-[1px] bg-rb-neutral-line" />

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
          <DesktopPerpsInput
            value={hourInput}
            onChange={handleHourInputChange}
            className="flex-1 text-right text-[13px] leading-[16px]"
            prefix={
              <span className="text-[13px] leading-[16px] font-medium text-rb-neutral-foot">
                {t('page.perpsPro.tradingPanel.hours')}
              </span>
            }
          />
          <DesktopPerpsInput
            value={minuteInput}
            onChange={handleMinuteInputChange}
            className="flex-1 text-right text-[13px] leading-[16px]"
            prefix={
              <span className="text-[13px] leading-[16px] font-medium text-rb-neutral-foot">
                {t('page.perpsPro.tradingPanel.minutes')}
              </span>
            }
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-16">
          <PerpsCheckbox
            checked={randomize}
            onChange={(checked) => setRandomize(checked)}
            tooltipText={t('page.perpsPro.tradingPanel.randomizeTooltip')}
            title={t('page.perpsPro.tradingPanel.randomize')}
          />
          <PerpsCheckbox
            checked={reduceOnly}
            onChange={setReduceOnly}
            tooltipText={t('page.perpsPro.tradingPanel.reduceOnlyTips')}
            title={t('page.perpsPro.tradingPanel.reduceOnly')}
            disabled={!currentPosition}
          />
        </div>
      </div>

      {/* Place Order Buttons */}
      <TradingButtons
        onBuyClick={handleBuyOrder}
        onSellClick={handleSellOrder}
        buyLoading={buyLoading}
        sellLoading={sellLoading}
        buyDisabled={!buyValidation.isValid || reduceOnlyBuyDisabled}
        sellDisabled={!sellValidation.isValid || reduceOnlySellDisabled}
        buyError={buyValidation.error}
        sellError={sellValidation.error}
      />

      {/* TWAP Order Summary */}
      <div className="space-y-[6px]">
        <div className="flex items-center justify-between">
          <span className="text-r-neutral-foot text-[13px]">
            {t('page.perpsPro.tradingPanel.frequency')}
          </span>
          <span className="text-r-neutral-title-1 font-medium text-[13px]">
            {t('page.perpsPro.tradingPanel.threeThirtySeconds')}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-r-neutral-foot text-[13px]">
            {t('page.perpsPro.tradingPanel.runtime')}
          </span>
          <span className="text-r-neutral-title-1 font-medium text-[13px]">
            {`${
              Math.floor(allMinsDuration / 60) >= 1
                ? Math.floor(allMinsDuration / 60) +
                  t('page.perpsPro.tradingPanel.hours')
                : ''
            } ${Math.floor(allMinsDuration % 60)} ${t(
              'page.perpsPro.tradingPanel.minutes'
            )}`}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-r-neutral-foot text-[13px]">
            {t('page.perpsPro.tradingPanel.numberOfOrders')}
          </span>
          <span className="text-r-neutral-title-1 font-medium text-[13px]">
            {numberOfOrders}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-r-neutral-foot text-[13px]">
            {t('page.perpsPro.tradingPanel.sizePerSuborder')}
          </span>
          <span className="text-r-neutral-title-1 font-medium text-[13px]">
            {sizePerSuborder} {selectedCoin}
          </span>
        </div>

        {/* Margin Required */}
        <div className="flex items-center justify-between">
          <span className="text-r-neutral-foot text-[13px]">
            {t('page.perpsPro.tradingPanel.marginRequired')}
          </span>
          <span className="text-r-neutral-title-1 font-medium text-[13px]">
            {reduceOnly ? '-' : formatUsdValue(marginRequired)}
          </span>
        </div>

        {/* Margin Usage */}
        <div className="flex items-center justify-between">
          <span className="text-r-neutral-foot text-[13px]">
            {t('page.perpsPro.tradingPanel.marginUsage')}
          </span>
          <span className="text-r-neutral-title-1 font-medium text-[13px]">
            {marginUsage}
          </span>
        </div>
      </div>
    </div>
  );
};
