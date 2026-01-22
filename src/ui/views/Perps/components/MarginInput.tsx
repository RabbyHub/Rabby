import React from 'react';
import BigNumber from 'bignumber.js';
import { formatUsdValue } from '@/ui/utils';
import { PerpsSlider } from '../components/PerpsSlider';
import { useTranslation } from 'react-i18next';
import { PERPS_MARGIN_SIGNIFICANT_DIGITS } from '../constants';
import clsx from 'clsx';
import { RcIconInfoCC } from '@/ui/assets/desktop/common';

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
      new BigNumber(newMargin).decimalPlaces(2, BigNumber.ROUND_DOWN).toFixed()
    );
  };

  return (
    <div className="bg-r-neutral-card1 rounded-[8px] mb-[12px] px-[16px] py-[16px]">
      <div className="text-[16px] leading-[19px] font-medium text-r-blue-default">
        {title}
      </div>
      <div className="flex items-center mb-[8px]">
        <div className="flex items-end gap-[6px]">
          <div className="text-[20px] leading-[24px] font-medium text-r-neutral-black">
            {formatUsdValue(availableAmount, BigNumber.ROUND_DOWN)}
          </div>
          <div className="text-[13px] leading-[16px] text-r-neutral-foot pb-[2px]">
            {customAvailableText ||
              t('page.perpsDetail.PerpsEditMarginPopup.available')}
          </div>
        </div>
        <input
          className={clsx(
            'flex-1',
            'text-[32px] leading-[38px] font-bold bg-transparent border-none p-0 text-right',
            'w-full outline-none focus:outline-none',
            textColorClass
          )}
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
      </div>

      <PerpsSlider
        disabled={sliderDisabled}
        value={sliderPercentage}
        onAfterChange={() => {
          isSliderChangingRef.current = false;
        }}
        onValueChange={handleSliderChange}
        showPercentage={false}
      />
      {errorMessage ? (
        <div className="bg-r-orange-light rounded-[8px] px-[12px] py-[8px] flex items-center gap-[4px] mt-[14px]">
          <RcIconInfoCC className="text-r-orange-default" />
          <div className="text-center text-[12px] leading-[14px] text-r-orange-default">
            {errorMessage}
          </div>
        </div>
      ) : null}
    </div>
  );
};
