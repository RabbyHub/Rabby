import React from 'react';
import { PositionSize } from '../../../types';
import { DesktopPerpsSlider } from '../../DesktopPerpsSlider';
import { useMemoizedFn } from 'ahooks';
import BigNumber from 'bignumber.js';
import { calcAssetAmountByNotional, calcAssetNotionalByAmount } from '../utils';
import { DesktopPerpsInput } from '../../DesktopPerpsInput';
const PRESET_POINTS = [0, 25, 50, 75, 100];

// Create marks for the slider
const SLIDER_MARKS = PRESET_POINTS.reduce((acc, point) => {
  acc[point] = '';
  return acc;
}, {} as Record<number, string>);

interface PositionSizeInputAndSliderProps {
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
  const [inputValue, setInputValue] = React.useState<string>(
    percentage.toString()
  );

  React.useEffect(() => {
    setInputValue(percentage.toString());
  }, [percentage]);

  const handleSliderChange = (value: number) => {
    handlePercentageChange(value);
  };

  const handlePresetClick = (value: number) => {
    handlePercentageChange(value);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty string or valid numbers
    if (value === '' || /^\d*$/.test(value)) {
      setInputValue(value);
    }
  };

  const handleInputBlur = () => {
    if (inputValue === '') {
      setInputValue('0');
      handlePercentageChange(0);
      return;
    }

    let numValue = parseInt(inputValue, 10);
    // Clamp value between 0 and 100
    if (numValue < 0) numValue = 0;
    if (numValue > 100) numValue = 100;

    setInputValue(numValue.toString());
    handlePercentageChange(numValue);
  };

  const handleAmountChange = useMemoizedFn((amount: string) => {
    if (!price) {
      setPositionSize({ amount, notionalValue: '' });
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
    // Allow numbers and decimal point
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      handleAmountChange(value);
    }
  };

  const handleNotionalChangeFormatted = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      handleNotionalChange(value);
    }
  };

  const handleAmountBlur = () => {
    const value = positionSize.amount;
    if (!value || value === '') {
      setPositionSize({ amount: '', notionalValue: '' });
      return;
    }
    const num = parseFloat(value);
    if (isNaN(num)) {
      setPositionSize({ amount: '', notionalValue: '' });
      return;
    }
    handleAmountChange(num.toFixed(precision.amount));
  };

  return (
    <>
      <div className="flex items-center gap-[8px]">
        <DesktopPerpsInput
          className="flex-1"
          value={positionSize.amount}
          onChange={handleAmountChangeFormatted}
          onBlur={handleAmountBlur}
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
          suffix={
            <span className="text-[13px] leading-[16px] font-medium text-rb-neutral-foot">
              {quoteAsset}
            </span>
          }
        />
      </div>
      <div className="flex items-start gap-[20px]">
        {/* Slider with preset points */}
        <div className="flex-1 space-y-[6px] px-4">
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
          <div className="relative">
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
        {/* <div className="flex items-center justify-between p-8 gap-[2px] h-[28px] w-[52px] shrink-0 border border-solid border-rb-neutral-line rounded-[8px] ">
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleInputKeyDown}
            className="w-[24px] text-[12px] text-rb-neutral-title-1 font-medium text-left bg-transparent border-none outline-none focus:outline-none px-0"
          />
          <span className="text-[12px] text-rb-neutral-foot font-medium">
            %
          </span>
        </div> */}
        <DesktopPerpsInput
          className="w-[60px] p-[8px]"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
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
