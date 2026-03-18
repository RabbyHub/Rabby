import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { OrderSide, OrderSideInfo } from '../../../types';
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
import { OrderInfoGrid } from '../components/OrderInfoGrid';
import { BigNumber } from 'bignumber.js';
import stats from '@/stats';
import { getStatsReportSide } from '../../../utils';
import { calcAmountFromPercentage } from '../utils';

interface TakeOrStopLimitTradingContainerProps {
  takeOrStop: 'tp' | 'sl';
}

export const TakeOrStopLimitTradingContainer: React.FC<TakeOrStopLimitTradingContainerProps> = ({
  takeOrStop,
}) => {
  const { t } = useTranslation();

  // Get data from perpsState
  const {
    currentPerpsAccount,
    leverageType,
    selectedCoin,
    positionSize,
    setPositionSize,
    currentPosition,
    markPrice,
    midPrice,
    szDecimals,
    leverage,
    availableBalance,
    reduceOnly,
    setReduceOnly,
    tradeSize,
    maxBuyTradeSize,
    maxSellTradeSize,
    currentMarketData,
    percentage,
    setPercentage,
    sizeDisplayUnit,
    setSizeDisplayUnit,
    resetForm,
    reduceOnlyBuyDisabled,
    reduceOnlySellDisabled,
    calcDirectionInfo,
    buyTradeSize,
    sellTradeSize,
  } = usePerpsTradingState();
  const [triggerPrice, setTriggerPrice] = React.useState('');
  const [limitPrice, setLimitPrice] = React.useState(
    formatTpOrSlPrice(midPrice, szDecimals)
  );

  // Estimated execution price per direction
  const estBuyPrice = Math.min(Number(limitPrice) || midPrice, midPrice);
  const estSellPrice = Math.max(Number(limitPrice) || midPrice, midPrice);

  const limitMaxBuyTradeSize = React.useMemo(() => {
    if (!estBuyPrice) return maxBuyTradeSize;
    const balanceBasedMax =
      availableBalance > 0
        ? Number(
            new BigNumber(availableBalance)
              .multipliedBy(leverage)
              .div(estBuyPrice)
              .toFixed(szDecimals, BigNumber.ROUND_DOWN)
          )
        : 0;
    const closable =
      currentPosition?.side === 'Short' ? currentPosition.size : 0;
    return (balanceBasedMax + closable).toFixed(szDecimals);
  }, [
    estBuyPrice,
    availableBalance,
    leverage,
    szDecimals,
    currentPosition,
    maxBuyTradeSize,
  ]);

  const limitMaxSellTradeSize = React.useMemo(() => {
    if (!estSellPrice) return maxSellTradeSize;
    const balanceBasedMax =
      availableBalance > 0
        ? Number(
            new BigNumber(availableBalance)
              .multipliedBy(leverage)
              .div(estSellPrice)
              .toFixed(szDecimals, BigNumber.ROUND_DOWN)
          )
        : 0;
    const closable =
      currentPosition?.side === 'Long' ? currentPosition.size : 0;
    return (balanceBasedMax + closable).toFixed(szDecimals);
  }, [
    estSellPrice,
    availableBalance,
    leverage,
    szDecimals,
    currentPosition,
    maxSellTradeSize,
  ]);

  // Use hook's calcDirectionInfo with direction-specific estPrice
  const buyDirInfo = React.useMemo(
    () => calcDirectionInfo('Long', buyTradeSize, estBuyPrice),
    [calcDirectionInfo, buyTradeSize, estBuyPrice]
  );
  const sellDirInfo = React.useMemo(
    () => calcDirectionInfo('Short', sellTradeSize, estSellPrice),
    [calcDirectionInfo, sellTradeSize, estSellPrice]
  );

  useEffect(() => {
    setTriggerPrice('');
    setLimitPrice(formatTpOrSlPrice(midPrice, szDecimals));
  }, [selectedCoin]);

  // Direction-dependent validation (deferred to button click)
  const getValidationForSide = (isBuy: boolean) => {
    let error: string = '';
    const tradeSize = Number(positionSize.amount) || 0;
    const notionalNum = tradeSize * Number(limitPrice || 0);
    const limitMaxTradeSize = isBuy
      ? limitMaxBuyTradeSize
      : limitMaxSellTradeSize;

    if (notionalNum === 0 || !Number(triggerPrice)) {
      return { isValid: false, error: '' };
    }

    // Check minimum order size ($10)
    if (notionalNum < 10) {
      error = t('page.perpsPro.tradingPanel.minimumOrderSize');
      return { isValid: false, error };
    }

    if (limitMaxTradeSize && tradeSize > Number(limitMaxTradeSize)) {
      error = t('page.perpsPro.tradingPanel.insufficientBalance');
      return { isValid: false, error };
    }

    if (
      takeOrStop === 'sl' &&
      isBuy &&
      Number(triggerPrice) &&
      Number(triggerPrice) < Number(midPrice)
    ) {
      error = t('page.perpsPro.tradingPanel.slBuyMustBeHigherThanMidPrice');
      return { isValid: false, error };
    }

    if (
      takeOrStop === 'sl' &&
      !isBuy &&
      Number(triggerPrice) &&
      Number(triggerPrice) > Number(midPrice)
    ) {
      error = t('page.perpsPro.tradingPanel.slSellMustBeLowerThanMidPrice');
      return { isValid: false, error };
    }

    if (
      takeOrStop === 'tp' &&
      isBuy &&
      Number(triggerPrice) &&
      Number(triggerPrice) > Number(midPrice)
    ) {
      error = t('page.perpsPro.tradingPanel.tpBuyMustBeLowerThanMidPrice');
      return { isValid: false, error };
    }

    if (
      takeOrStop === 'tp' &&
      !isBuy &&
      Number(triggerPrice) &&
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
  };

  const buyValidation = useMemo(() => getValidationForSide(true), [
    positionSize.amount,
    limitPrice,
    limitMaxBuyTradeSize,
    reduceOnly,
    percentage,
    midPrice,
    takeOrStop,
    triggerPrice,
    currentMarketData,
    t,
  ]);

  const sellValidation = useMemo(() => getValidationForSide(false), [
    positionSize.amount,
    limitPrice,
    limitMaxSellTradeSize,
    reduceOnly,
    percentage,
    midPrice,
    takeOrStop,
    triggerPrice,
    currentMarketData,
    t,
  ]);

  const {
    handleOpenTPSlLimitOrder,
    needEnableTrading,
    handleActionApproveStatus,
  } = usePerpsProPosition();

  const getDirectionTradeSize = (isBuy: boolean): string => {
    if (positionSize.inputSource === 'slider') {
      const dirMax = isBuy ? limitMaxBuyTradeSize : limitMaxSellTradeSize;
      return calcAmountFromPercentage(percentage, dirMax, szDecimals);
    }
    return tradeSize;
  };

  const { run: handleBuyOrder, loading: buyLoading } = useRequest(
    async () => {
      const isBuy = true;
      const directionSize = getDirectionTradeSize(isBuy);
      await handleOpenTPSlLimitOrder({
        coin: selectedCoin,
        isBuy,
        size: directionSize,
        triggerPx: triggerPrice,
        limitPx: limitPrice,
        reduceOnly,
        tpsl: takeOrStop,
      });
      stats.report('perpsTradeHistory', {
        created_at: new Date().getTime(),
        user_addr: currentPerpsAccount?.address || '',
        trade_type:
          takeOrStop === 'tp' ? 'take profit limit' : 'stop loss limit',
        leverage: leverage.toString(),
        trade_side: getStatsReportSide(isBuy, reduceOnly),
        margin_mode: leverageType === 'cross' ? 'cross' : 'isolated',
        coin: selectedCoin,
        size: tradeSize,
        price: limitPrice,
        trade_usd_value: new BigNumber(limitPrice).times(tradeSize).toFixed(2),
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
      await handleOpenTPSlLimitOrder({
        coin: selectedCoin,
        isBuy,
        size: directionSize,
        triggerPx: triggerPrice,
        limitPx: limitPrice,
        reduceOnly,
        tpsl: takeOrStop,
      });
      stats.report('perpsTradeHistory', {
        created_at: new Date().getTime(),
        user_addr: currentPerpsAccount?.address || '',
        trade_type:
          takeOrStop === 'tp' ? 'take profit limit' : 'stop loss limit',
        leverage: leverage.toString(),
        trade_side: getStatsReportSide(isBuy, reduceOnly),
        margin_mode: leverageType === 'cross' ? 'cross' : 'isolated',
        coin: selectedCoin,
        size: tradeSize,
        price: limitPrice,
        trade_usd_value: new BigNumber(limitPrice).times(tradeSize).toFixed(2),
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

  // Build OrderSideInfo using hook's calcDirectionInfo
  const limitBuyInfo: OrderSideInfo = useMemo(
    () => ({
      liqPrice: buyDirInfo.liqPrice,
      cost: buyDirInfo.cost,
      max: limitMaxBuyTradeSize || '0',
    }),
    [buyDirInfo, limitMaxBuyTradeSize]
  );

  const limitSellInfo: OrderSideInfo = useMemo(
    () => ({
      liqPrice: sellDirInfo.liqPrice,
      cost: sellDirInfo.cost,
      max: limitMaxSellTradeSize || '0',
    }),
    [sellDirInfo, limitMaxSellTradeSize]
  );

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
      <OrderSideAndFunds availableBalance={availableBalance} />

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
          className="w-[88px] h-[40px] flex items-center justify-center text-center bg-rb-neutral-bg-2 font-medium text-[13px] text-r-neutral-title-1 rounded-[8px] cursor-pointer hover:border-rb-brand-default border border-solid border-transparent"
          onClick={handleLimitMidClick}
        >
          Mid
        </div>
      </div>

      {/* Position Size Input */}
      <PositionSizeInputAndSlider
        price={limitPrice}
        maxBuyTradeSize={limitMaxBuyTradeSize}
        maxSellTradeSize={limitMaxSellTradeSize}
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

      <div className="flex items-center justify-between">
        <PerpsCheckbox
          checked={reduceOnly}
          onChange={setReduceOnly}
          tooltipText={t('page.perpsPro.tradingPanel.reduceOnlyTips')}
          title={t('page.perpsPro.tradingPanel.reduceOnly')}
          disabled={!currentPosition}
        />
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

      {/* Order Info */}
      <OrderInfoGrid
        buy={limitBuyInfo}
        sell={limitSellInfo}
        displayUnit={sizeDisplayUnit}
        selectedCoin={selectedCoin}
        reduceOnly={reduceOnly}
      />
    </div>
  );
};
