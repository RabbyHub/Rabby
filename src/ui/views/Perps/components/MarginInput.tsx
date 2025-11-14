import React from 'react';
import BigNumber from 'bignumber.js';
import { formatUsdValue } from '@/ui/utils';
import { PerpsSlider } from '../components/PerpsSlider';
import { useTranslation } from 'react-i18next';
import { PERPS_MARGIN_SIGNIFICANT_DIGITS } from '../constants';

interface MarginInputProps {
  title: string;
  availableAmount: number;
  sliderDisabled?: boolean;
  margin: string;
  onMarginChange: (value: string) => void;
  errorMessage?: string | null;
  customAvailableText?: string;
}

export const MarginInput: React.FC<MarginInputProps> = ({
  title,
  availableAmount,
  sliderDisabled,
  margin,
  onMarginChange,
  errorMessage,
  customAvailableText,
}) => {
  const { t } = useTranslation();
  const textColorClass =
    errorMessage && errorMessage.length
      ? 'text-r-red-default'
      : 'text-r-neutral-title-1';

  // 保存 slider 的百分比值，用于在 availableAmount 改变时保持 slider 位置
  const sliderPercentageRef = React.useRef<number | null>(null);
  const isSliderChangingRef = React.useRef<boolean>(false);
  const prevAvailableAmountRef = React.useRef<number>(availableAmount);

  // 当 margin 被外部重置为空时，清除 slider 百分比
  React.useEffect(() => {
    if (margin === '' && !isSliderChangingRef.current) {
      sliderPercentageRef.current = null;
    }
  }, [margin]);

  // 当 availableAmount 改变时，如果 slider 百分比已设置，重新计算 margin
  React.useEffect(() => {
    if (
      sliderPercentageRef.current !== null &&
      prevAvailableAmountRef.current !== availableAmount &&
      !isSliderChangingRef.current
    ) {
      const newMargin = (availableAmount * sliderPercentageRef.current) / 100;
      onMarginChange(Number(new BigNumber(newMargin).toFixed(6)).toString());
    }
    prevAvailableAmountRef.current = availableAmount;
  }, [availableAmount, onMarginChange]);

  // 计算 slider 百分比：如果 slider 百分比已设置，使用它；否则根据 margin 计算
  const sliderPercentage = React.useMemo(() => {
    const marginValue = Number(margin) || 0;
    if (marginValue === 0 || availableAmount === 0) {
      return 0;
    }
    if (sliderPercentageRef.current !== null) {
      return sliderPercentageRef.current;
    }
    return Math.min(Math.ceil((marginValue / availableAmount) * 100), 100);
  }, [margin, availableAmount]);

  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    let value = e.target.value;
    if (value.startsWith('$')) {
      value = value.slice(1);
    }
    if (/^\d*\.?\d*$/.test(value) || value === '') {
      // 用户通过输入框改变 margin 时，清除 slider 百分比，让它重新计算
      if (!isSliderChangingRef.current) {
        sliderPercentageRef.current = null;
      }
      onMarginChange(value);
    }
  };

  const handleSliderChange = (value: number) => {
    isSliderChangingRef.current = true;
    sliderPercentageRef.current = value;
    const newMargin = (availableAmount * value) / 100;
    onMarginChange(
      Number(
        new BigNumber(newMargin).toFixed(PERPS_MARGIN_SIGNIFICANT_DIGITS)
      ).toString()
    );
  };

  return (
    <div className="bg-r-neutral-card1 rounded-[8px] h-[120px] flex flex-col items-center justify-center mb-10 px-16">
      <div className="text-16 font-bold text-r-neutral-title-1 text-center">
        {title}
      </div>
      <input
        className={`text-[24px] font-bold bg-transparent border-none p-0 text-center w-full outline-none focus:outline-none ${textColorClass}`}
        style={{
          background: 'transparent',
          border: 'none',
          outline: 'none',
          boxShadow: 'none',
        }}
        placeholder="$0"
        value={margin ? `$${margin}` : ''}
        onChange={handleChange}
      />
      {errorMessage ? (
        <div className="text-center text-13 text-r-red-default">
          {errorMessage}
        </div>
      ) : (
        <div className="text-center text-13 text-r-neutral-body">
          {customAvailableText ||
            t('page.perpsDetail.PerpsEditMarginPopup.available')}
          : {formatUsdValue(availableAmount, BigNumber.ROUND_DOWN)}
        </div>
      )}

      <PerpsSlider
        disabled={sliderDisabled}
        value={sliderPercentage}
        onAfterChange={() => {
          isSliderChangingRef.current = false;
        }}
        onValueChange={handleSliderChange}
        showPercentage
      />
    </div>
  );
};
