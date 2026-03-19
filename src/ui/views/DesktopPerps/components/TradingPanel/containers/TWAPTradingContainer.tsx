import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { OrderSideInfo, TradingContainerProps } from '../../../types';
import { usePerpsProPosition } from '../../../hooks/usePerpsProPosition';
import { useRequest } from 'ahooks';
import { OrderSideAndFunds } from '../components/OrderSideAndFunds';
import { PositionSizeInputAndSliderV2 as PositionSizeInputAndSlider } from '../components/PositionSizeInputAndSliderV2';
import { usePerpsTradingState } from '../../../hooks/usePerpsTradingState';
import { PerpsCheckbox } from '../components/PerpsCheckbox';
import { DesktopPerpsInputV2 as DesktopPerpsInput } from '../../DesktopPerpsInputV2';
import { TradingButtons } from '../components/TradingButtons';
import { OrderInfoGrid } from '../components/OrderInfoGrid';
import stats from '@/stats';
import { getStatsReportSide } from '../../../utils';
import { BigNumber } from 'bignumber.js';
import { calcAmountFromPercentage } from '../utils';
import clsx from 'clsx';

const RUNTIME_PRESETS = [
  { label: '1h', hours: 1, minutes: 0 },
  { label: '6h', hours: 6, minutes: 0 },
  { label: '12h', hours: 12, minutes: 0 },
  { label: '24h', hours: 24, minutes: 0 },
];

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
    leverage,
    leverageType,
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

  // Max duration calculation based on current input size (each suborder must be >= $10)
  const { maxDurationMins, maxDurationDisplay } = useMemo(() => {
    const currentSize = Number(positionSize.amount) || 0;
    const notional = currentSize * midPrice;
    const maxOrders = Math.floor(notional / 10);
    if (maxOrders <= 1) {
      return { maxDurationMins: 0, maxDurationDisplay: '' };
    }
    const maxMins = Math.min(Math.floor(((maxOrders - 1) * 30) / 60), 1440);
    const hours = Math.floor(maxMins / 60);
    const mins = maxMins % 60;
    const display =
      hours > 0 ? `${hours}h ${mins > 0 ? `${mins}m` : ''}`.trim() : `${mins}m`;
    return { maxDurationMins: maxMins, maxDurationDisplay: display };
  }, [positionSize.amount, midPrice]);

  useEffect(() => {
    setHourInput('0');
    setMinuteInput('5');
    setRandomize(false);
  }, [selectedCoin]);

  // Order info for dual-column grid
  const buyInfo: OrderSideInfo = useMemo(() => {
    const info = calcDirectionInfo('Long', buyTradeSize);
    return { ...info, max: maxBuyTradeSize || '0' };
  }, [calcDirectionInfo, buyTradeSize, maxBuyTradeSize]);

  const sellInfo: OrderSideInfo = useMemo(() => {
    const info = calcDirectionInfo('Short', sellTradeSize);
    return { ...info, max: maxSellTradeSize || '0' };
  }, [calcDirectionInfo, sellTradeSize, maxSellTradeSize]);

  // Shared validation (direction-agnostic)
  const validation = useMemo(() => {
    const size = Number(positionSize.amount) || 0;
    const notionalNum = size * midPrice;

    if (notionalNum === 0) {
      return { isValid: false, error: '' };
    }

    if (allMinsDuration < 5) {
      return {
        isValid: false,
        error: t('page.perpsPro.tradingPanel.runtimeTooShort'),
      };
    }

    if (allMinsDuration > 1440) {
      return {
        isValid: false,
        error: t('page.perpsPro.tradingPanel.runtimeTooLong'),
      };
    }

    if (notionalNum < 10) {
      return {
        isValid: false,
        error: t('page.perpsPro.tradingPanel.minimumOrderSize'),
      };
    }

    if (Number(sizePerSuborder) * midPrice < 10) {
      return {
        isValid: false,
        error: t('page.perpsPro.tradingPanel.minimumSuborderSize'),
      };
    }

    // Max trade size - use max of both directions (shared check)
    const effectiveMaxTradeSize = reduceOnly
      ? Number(
          currentPosition?.side === 'Long'
            ? maxSellTradeSize
            : maxBuyTradeSize || 0
        )
      : Math.max(Number(maxBuyTradeSize || 0), Number(maxSellTradeSize || 0));

    if (effectiveMaxTradeSize > 0 && size > effectiveMaxTradeSize) {
      return {
        isValid: false,
        error: t('page.perpsPro.tradingPanel.insufficientBalance'),
      };
    }

    const maxUsdValue = Number(currentMarketData?.maxUsdValueSize || 1000000);
    if (notionalNum > maxUsdValue) {
      return {
        isValid: false,
        error:
          t('page.perpsPro.tradingPanel.maximumOrderSize', {
            amount: `$${maxUsdValue}`,
          }) || `Maximum order size is $${maxUsdValue}`,
      };
    }

    return { isValid: true, error: '' };
  }, [
    positionSize.amount,
    midPrice,
    allMinsDuration,
    sizePerSuborder,
    maxBuyTradeSize,
    maxSellTradeSize,
    reduceOnly,
    currentPosition,
    currentMarketData,
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
    <div className="space-y-[12px]">
      <OrderSideAndFunds availableBalance={availableBalance} />

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

      {/* Total Time Section */}
      <div className="flex flex-col gap-[8px]">
        <span className="text-rb-neutral-secondary text-[12px]">
          {t('page.perpsPro.tradingPanel.totalTime')}
        </span>

        {/* Hour / Min inputs */}
        <div className="flex items-center gap-[8px]">
          <DesktopPerpsInput
            value={hourInput}
            onChange={handleHourInputChange}
            className="flex-1 text-left"
            suffix={
              <span className="text-15 font-medium text-rb-neutral-title-1">
                {t('page.perpsPro.tradingPanel.hour')}
              </span>
            }
          />
          <DesktopPerpsInput
            value={minuteInput}
            onChange={handleMinuteInputChange}
            className="flex-1 text-left"
            suffix={
              <span className="text-15 font-medium text-rb-neutral-title-1">
                {t('page.perpsPro.tradingPanel.min')}
              </span>
            }
          />
        </div>

        {/* Preset buttons */}
        <div className="flex items-center gap-[8px]">
          {RUNTIME_PRESETS.map((preset) => {
            const presetMins = preset.hours * 60 + preset.minutes;
            const isActive =
              Number(hourInput) === preset.hours &&
              Number(minuteInput) === preset.minutes;
            const isDisabled = presetMins > maxDurationMins;
            return (
              <div
                key={preset.label}
                className={clsx(
                  'flex-1 h-[32px] flex items-center justify-center text-center font-medium text-[13px] rounded-[6px] border border-solid',
                  isActive
                    ? 'bg-rb-brand-light-1 text-rb-neutral-title-1 border-rb-brand-default cursor-pointer'
                    : isDisabled
                    ? 'bg-rb-neutral-bg-2 text-rb-neutral-foot border-transparent opacity-50 cursor-not-allowed'
                    : 'bg-rb-neutral-bg-2 text-r-neutral-title-1 border-transparent hover:border-rb-brand-default cursor-pointer'
                )}
                onClick={() => {
                  if (!isDisabled) {
                    setHourInput(String(preset.hours));
                    setMinuteInput(String(preset.minutes));
                  }
                }}
              >
                {preset.label}
              </div>
            );
          })}
        </div>

        {/* Max duration + Number of Orders info */}
        {maxDurationMins >= 5 && (
          <div className="text-rb-neutral-secondary text-[12px]">
            {t('page.perpsPro.tradingPanel.maxDurationTwap')}{' '}
            <span className="font-medium text-rb-neutral-title-1">
              {maxDurationDisplay}
            </span>
            .
          </div>
        )}
        <div className="text-rb-neutral-secondary text-[12px]">
          {t('page.perpsPro.tradingPanel.numberOfOrders')}{' '}
          <span className="font-medium text-rb-neutral-title-1">
            {numberOfOrders}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-[12px]">
        <PerpsCheckbox
          checked={reduceOnly}
          onChange={setReduceOnly}
          tooltipText={t('page.perpsPro.tradingPanel.reduceOnlyTips')}
          title={t('page.perpsPro.tradingPanel.reduceOnly')}
          disabled={!currentPosition}
        />
        <PerpsCheckbox
          checked={randomize}
          onChange={(checked) => setRandomize(checked)}
          tooltipText={t('page.perpsPro.tradingPanel.randomizeTooltip')}
          title={t('page.perpsPro.tradingPanel.randomize')}
        />
      </div>

      <TradingButtons
        onBuyClick={handleBuyOrder}
        onSellClick={handleSellOrder}
        buyLoading={buyLoading}
        sellLoading={sellLoading}
        buyDisabled={!validation.isValid || reduceOnlyBuyDisabled}
        sellDisabled={!validation.isValid || reduceOnlySellDisabled}
        buyError={validation.error || undefined}
        sellError={validation.error || undefined}
      />

      <OrderInfoGrid
        buy={buyInfo}
        sell={sellInfo}
        displayUnit={sizeDisplayUnit}
        selectedCoin={selectedCoin}
        reduceOnly={reduceOnly}
        hideLiqPrice
      />
    </div>
  );
};
