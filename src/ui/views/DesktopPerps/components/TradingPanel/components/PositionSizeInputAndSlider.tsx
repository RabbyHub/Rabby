import React, { useEffect } from 'react';
import { PositionSize } from '../../../types';
import { DesktopPerpsSlider } from '../../DesktopPerpsSlider';
import { useMemoizedFn } from 'ahooks';
import BigNumber from 'bignumber.js';
import {
  calcAssetAmountByNotional,
  calcAssetNotionalByAmount,
  removeTrailingZeros,
  validateAmountInput,
  formatAmount,
  validateNotionalInput,
  formatNotional,
} from '../utils';
import { DesktopPerpsInput } from '../../DesktopPerpsInput';
import { formatPerpsCoin } from '../../../utils';
const PRESET_POINTS = [0, 25, 50, 75, 100];

// Create marks for the slider
const SLIDER_MARKS = PRESET_POINTS.reduce((acc, point) => {
  acc[point] = '';
  return acc;
}, {} as Record<number, string>);

interface PositionSizeInputAndSliderProps {
  defaultMax?: boolean;
  price: number | string;
  maxTradeSize: string | undefined;
  positionSize: PositionSize;
  setPositionSize: (positionSize: PositionSize) => void;
  baseAsset: string;
  quoteAsset: string;
  percentage: number;
  setPercentage: (percentage: number) => void;
  szDecimals: number;
  priceChangeUsdValue?: boolean;
  reduceOnly?: boolean;
}

export const PositionSizeInputAndSlider: React.FC<PositionSizeInputAndSliderProps> = ({
  defaultMax,
  price,
  maxTradeSize,
  positionSize,
  setPositionSize,
  baseAsset,
  quoteAsset,
  percentage,
  setPercentage,
  szDecimals,
  priceChangeUsdValue,
  reduceOnly,
}) => {
  const [
    percentageInputValue,
    setPercentageInputValue,
  ] = React.useState<string>(percentage.toString());

  React.useEffect(() => {
    setPercentageInputValue(isNaN(percentage) ? '' : percentage.toString());
  }, [percentage]);

  const handleSliderChange = useMemoizedFn((value: number) => {
    handlePercentageChange(value);
  });

  const handlePresetClick = useMemoizedFn((value: number) => {
    handlePercentageChange(value);
  });

  useEffect(() => {
    if (positionSize.amount) {
      handleAmountChange(positionSize.amount);
    }
  }, [reduceOnly]);

  const handlePercentageInputChange = useMemoizedFn(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;

      if (value === '') {
        setPercentageInputValue('');
        handlePercentageChange(0);
        return;
      }

      if (Number(value) > 100) {
        setPercentageInputValue('100');
        handlePercentageChange(100);
        return;
      }

      if (Number(value) < 0) {
        setPercentageInputValue('0');
        handlePercentageChange(0);
        return;
      }

      if (!/^\d*$/.test(value)) {
        return;
      }

      setPercentageInputValue(value);

      const numeric = Number(value) || 0;
      const clamped = Math.max(0, Math.min(100, numeric));
      handlePercentageChange(clamped);
    }
  );

  const handleAmountChange = useMemoizedFn((amount: string) => {
    if (!price) {
      setPositionSize({ amount, notionalValue: '' });
      setPercentage(0);
      return;
    }

    const amountNum = Number(amount) || 0;
    const notionalValue = amountNum * Number(price);
    const notionalStr = notionalValue > 0 ? notionalValue.toFixed(2) : '';

    setPositionSize({
      amount,
      notionalValue: notionalStr,
    });

    if (maxTradeSize && Number(maxTradeSize) > 0) {
      const pct = Math.min(
        new BigNumber(amount)
          .div(new BigNumber(maxTradeSize))
          .multipliedBy(100)
          .toNumber(),
        100
      );
      setPercentage(Math.round(pct));
    }
  });

  useEffect(() => {
    if (priceChangeUsdValue && positionSize.amount) {
      positionSize.isInputNotionalValue
        ? handleNotionalChange(positionSize.notionalValue)
        : handleAmountChange(positionSize.amount);
    }
  }, [price, priceChangeUsdValue, positionSize.isInputNotionalValue]);

  const handleNotionalChange = useMemoizedFn((notional: string) => {
    if (!price) {
      setPositionSize({
        amount: '',
        notionalValue: notional,
        isInputNotionalValue: true,
      });
      setPercentage(0);
      return;
    }

    const amount = notional
      ? calcAssetAmountByNotional(notional, price, szDecimals)
      : '';
    setPositionSize({
      amount,
      notionalValue: notional,
      isInputNotionalValue: true,
    });

    if (maxTradeSize && Number(maxTradeSize) > 0) {
      const pct = Math.min(
        Math.round(
          new BigNumber(amount)
            .div(new BigNumber(maxTradeSize))
            .multipliedBy(100)
            .toNumber()
        ),
        100
      );
      setPercentage(pct);
    }
  });

  const handlePercentageChange = useMemoizedFn((newPercentage: number) => {
    setPercentage(newPercentage);

    const orderSize = new BigNumber(maxTradeSize || 0)
      .multipliedBy(newPercentage)
      .div(100);
    const notionalValue = orderSize
      .multipliedBy(new BigNumber(price))
      .toNumber();

    if (notionalValue === 0 || !price) {
      setPositionSize({ amount: '', notionalValue: '' });
      // setPercentage(0);
      return;
    }

    let amount = calcAssetAmountByNotional(notionalValue, price, szDecimals);
    let newNotionalValue = calcAssetNotionalByAmount(amount, price);
    if (
      maxTradeSize &&
      (Number(amount) > Number(maxTradeSize) || newPercentage === 100)
    ) {
      amount = maxTradeSize;
      newNotionalValue = calcAssetNotionalByAmount(maxTradeSize, price);
    }
    setPositionSize({
      amount,
      notionalValue: newNotionalValue,
    });
  });

  const handleAmountChangeFormatted = useMemoizedFn(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      // Validate input based on szDecimals
      if (validateAmountInput(value, szDecimals)) {
        handleAmountChange(value);
      }
    }
  );

  const handleNotionalChangeFormatted = useMemoizedFn(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      // Validate notional input (max 2 decimal places)
      if (validateNotionalInput(value)) {
        handleNotionalChange(value);
      }
    }
  );

  useEffect(() => {
    if (defaultMax) {
      handlePercentageChange(100);
    }
  }, [defaultMax]);

  return (
    <>
      <div className="flex items-center gap-[8px]">
        <DesktopPerpsInput
          className="flex-1"
          value={positionSize.amount}
          onChange={handleAmountChangeFormatted}
          suffix={
            <span className="text-[13px] leading-[16px] font-medium text-rb-neutral-foot">
              {formatPerpsCoin(baseAsset)}
            </span>
          }
        />

        <DesktopPerpsInput
          className="flex-1"
          value={positionSize.notionalValue}
          onChange={handleNotionalChangeFormatted}
          suffix={
            <span className="text-[13px] leading-[16px] font-medium text-rb-neutral-foot">
              {quoteAsset}
            </span>
          }
        />
      </div>
      <div className="flex items-start gap-[20px]">
        {/* Slider with preset points */}
        <div className="flex-1 space-y-[6px] px-4 my-12">
          <DesktopPerpsSlider
            min={0}
            max={100}
            value={percentage}
            onChange={handleSliderChange}
            step={1}
            marks={SLIDER_MARKS}
            tooltipVisible={false}
          />
          {/* Preset Points */}
          <div className="relative ml-2">
            {PRESET_POINTS.map((point) => (
              <button
                key={point}
                onClick={() => handlePresetClick(point)}
                className="absolute text-[11px] text-r-neutral-foot hover:text-r-blue-default hover:font-medium -translate-x-1/2"
                style={{ left: `${point}%` }}
              >
                {point}%
              </button>
            ))}
          </div>
        </div>

        {/* Percentage input */}
        <DesktopPerpsInput
          className="w-[60px] p-[8px]"
          value={percentageInputValue}
          onChange={handlePercentageInputChange}
          suffix={
            <span className="text-[13px] leading-[16px] font-medium text-rb-neutral-foot">
              %
            </span>
          }
        />
      </div>
    </>
  );
};
