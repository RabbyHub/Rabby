import React from 'react';
import { PositionSize } from '../../../types';
import { DesktopPerpsSlider } from '../../DesktopPerpsSlider';
import { useMemoizedFn } from 'ahooks';
import BigNumber from 'bignumber.js';
import { calcAssetAmountByNotional, calcAssetNotionalByAmount } from '../utils';
const PRESET_POINTS = [0, 25, 50, 75, 100];

// Create marks for the slider
const SLIDER_MARKS = PRESET_POINTS.reduce((acc, point) => {
  acc[point] = '';
  return acc;
}, {} as Record<number, string>);

interface PositionSizeInputAndSliderProps {
  price: number | string;
  maxTradeSize: string | undefined;
  availableBalance: number;
  leverage: number;
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
  availableBalance,
  leverage,
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

    if (availableBalance > 0) {
      const marginNeeded = notionalValue / leverage;
      const pct = Math.min((marginNeeded / availableBalance) * 100, 100);
      setPercentage(Math.round(pct));
    }
  });

  const handleNotionalChange = useMemoizedFn((notional: string) => {
    if (!price) {
      setPositionSize({ amount: '', notionalValue: notional });
      return;
    }

    let newNotional = notional;
    const notionalNum = new BigNumber(notional || 0);
    let amount = calcAssetAmountByNotional(notional, price, precision.amount);
    if (maxTradeSize && Number(amount) > Number(maxTradeSize)) {
      amount = maxTradeSize;
      newNotional = calcAssetNotionalByAmount(amount, price);
    }
    setPositionSize({
      amount,
      notionalValue: newNotional,
    });

    if (availableBalance > 0) {
      const marginNeeded = notionalNum.div(leverage);
      const pct = Math.min(
        Math.round(
          marginNeeded
            .div(new BigNumber(availableBalance))
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

  const formatNumber = (value: string, decimals: number): string => {
    if (!value || value === '') return '';
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    return num.toFixed(decimals);
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
    handleAmountChange(formatNumber(positionSize.amount, precision.amount));
  };

  return (
    <>
      <div className="flex items-center gap-[8px]">
        {/* Amount Input */}
        <div className="flex-1">
          <div className="relative">
            <input
              type="text"
              value={positionSize.amount}
              onChange={handleAmountChangeFormatted}
              onBlur={handleAmountBlur}
              placeholder="0"
              className="w-full h-[40px] p-12 rounded-[8px] bg-rb-neutral-bg-1 border border-solid border-rb-neutral-line text-r-neutral-title-1 text-[13px] focus:outline-none  font-medium"
            />
            <div className="absolute right-[8px] top-1/2 -translate-y-1/2 text-r-neutral-foot text-[13px]">
              {baseAsset}
            </div>
          </div>
        </div>

        {/* Notional Value Input */}
        <div className="flex-1">
          <div className="relative">
            <input
              type="text"
              value={positionSize.notionalValue}
              onChange={handleNotionalChangeFormatted}
              placeholder="0"
              className="w-full h-[40px] p-12 rounded-[8px] bg-rb-neutral-bg-1 border border-solid border-rb-neutral-line text-r-neutral-title-1 text-[13px] focus:outline-none font-medium"
            />
            <div className="absolute right-[8px] top-1/2 -translate-y-1/2 text-r-neutral-foot text-[13px]">
              {quoteAsset}
            </div>
          </div>
        </div>
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
        <div className="flex items-center justify-between p-8 gap-[2px] h-[28px] w-[52px] shrink-0 border border-solid border-rb-neutral-line rounded-[8px] ">
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
        </div>
      </div>
    </>
  );
};
