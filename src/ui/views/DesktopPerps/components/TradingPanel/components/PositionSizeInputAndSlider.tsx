import React, { useEffect } from 'react';
import { PositionSize } from '../../../types';
import { DesktopPerpsSlider } from '../../DesktopPerpsSlider';
import { useMemoizedFn } from 'ahooks';
import BigNumber from 'bignumber.js';
import {
  calcAssetAmountByNotional,
  calcAssetNotionalByAmount,
  removeTrailingZeros,
} from '../utils';
import { DesktopPerpsInput } from '../../DesktopPerpsInput';
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
  precision: {
    amount: number;
    price: number;
  };
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
  precision,
}) => {
  const [
    percentageInputValue,
    setPercentageInputValue,
  ] = React.useState<string>(percentage.toString());

  React.useEffect(() => {
    setPercentageInputValue(percentage.toString());
  }, [percentage]);

  const handleSliderChange = (value: number) => {
    handlePercentageChange(value);
  };

  const handlePresetClick = (value: number) => {
    handlePercentageChange(value);
  };

  const handlePercentageInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    // Allow empty string or valid numbers
    if (value === '' || /^\d*$/.test(value)) {
      setPercentageInputValue(value);
    }
  };

  const handlePercentageInputBlur = () => {
    if (percentageInputValue === '') {
      setPercentageInputValue('0');
      handlePercentageChange(0);
      return;
    }

    let numValue = parseInt(percentageInputValue, 10);
    // Clamp value between 0 and 100
    if (numValue < 0) numValue = 0;
    if (numValue > 100) numValue = 100;

    setPercentageInputValue(numValue.toString());
    handlePercentageChange(numValue);
  };

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

  const handleNotionalChange = useMemoizedFn((notional: string) => {
    if (!price) {
      setPositionSize({ amount: '', notionalValue: notional });
      setPercentage(0);
      return;
    }

    let newNotional = notional;
    let amount = calcAssetAmountByNotional(notional, price, precision.amount);
    if (maxTradeSize && Number(amount) > Number(maxTradeSize)) {
      amount = maxTradeSize;
      newNotional = calcAssetNotionalByAmount(amount, price);
    }
    setPositionSize({
      amount,
      notionalValue: newNotional,
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
      setPercentage(maxTradeSize === amount ? 100 : pct);
    }
  });

  const handleNotionalChangeWithoutLimit = useMemoizedFn((notional: string) => {
    if (!price) {
      setPositionSize({ amount: '', notionalValue: notional });
      setPercentage(0);
      return;
    }

    const amount = calcAssetAmountByNotional(notional, price, precision.amount);
    setPositionSize({
      amount,
      notionalValue: notional,
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
      setPercentage(0);
      return;
    }

    let amount = calcAssetAmountByNotional(
      notionalValue,
      price,
      precision.amount
    );
    let newNotionalValue = calcAssetNotionalByAmount(amount, price);
    if (
      maxTradeSize &&
      (Number(amount) > Number(maxTradeSize) || percentage === 100)
    ) {
      amount = maxTradeSize;
      newNotionalValue = calcAssetNotionalByAmount(maxTradeSize, price);
    }
    setPositionSize({
      amount,
      notionalValue: newNotionalValue,
    });
  });

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  const handleAmountChangeFormatted = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    // Allow numbers and decimal point, calculate notional and percentage immediately without limit
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      handleAmountChange(value);
    }
  };

  const handleNotionalChangeFormatted = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    // Allow numbers and decimal point, calculate amount and percentage immediately without limit
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      handleNotionalChangeWithoutLimit(value);
    }
  };

  const handleAmountBlur = () => {
    const value = positionSize.amount;
    if (!value || value === '') {
      setPositionSize({ amount: '', notionalValue: '' });
      setPercentage(0);
      return;
    }
    const num = parseFloat(value);
    if (isNaN(num) || num === 0) {
      setPositionSize({ amount: '', notionalValue: '' });
      setPercentage(0);
      return;
    }

    // Check max trade size and clamp if exceeded
    let finalAmount = num;
    if (maxTradeSize && num > Number(maxTradeSize)) {
      finalAmount = Number(maxTradeSize);
    }

    // Format and calculate on blur
    handleAmountChange(
      removeTrailingZeros(finalAmount.toFixed(precision.amount))
    );
  };

  const handleNotionalBlur = () => {
    const value = positionSize.notionalValue;
    if (!value || value === '') {
      setPositionSize({ amount: '', notionalValue: '' });
      setPercentage(0);
      return;
    }
    const num = parseFloat(value);
    if (isNaN(num) || num === 0) {
      setPositionSize({ amount: '', notionalValue: '' });
      setPercentage(0);
      return;
    }

    // Format and calculate on blur (max check is inside handleNotionalChange)
    const formatted = num.toFixed(2);
    handleNotionalChange(formatted);
  };

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
          onBlur={handleAmountBlur}
          onKeyDown={handleInputKeyDown}
          suffix={
            <span className="text-[13px] leading-[16px] font-medium text-rb-neutral-foot">
              {baseAsset}
            </span>
          }
        />

        <DesktopPerpsInput
          className="flex-1"
          value={positionSize.notionalValue}
          onChange={handleNotionalChangeFormatted}
          onBlur={handleNotionalBlur}
          onKeyDown={handleInputKeyDown}
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
                className="absolute text-[11px] text-r-neutral-foot transition-colors hover:text-r-blue-default -translate-x-1/2"
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
          onBlur={handlePercentageInputBlur}
          onKeyDown={handleInputKeyDown}
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
