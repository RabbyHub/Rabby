import React from 'react';
import BigNumber from 'bignumber.js';
import { formatUsdValue } from '@/ui/utils';
import { PerpsSlider } from '../components/PerpsSlider';
import { useTranslation } from 'react-i18next';
import { PERPS_MARGIN_SIGNIFICANT_DIGITS } from '../constants';
import clsx from 'clsx';
import { RcIconInfoCC } from '@/ui/assets/desktop/common';

interface MarginEditInputProps {
  title: string;
  placeholder?: string;
  sliderDisabled?: boolean;
  margin: string;
  minMargin: number;
  maxMargin: number;
  onMarginChange: (value: string) => void;
  errorMessage?: string | null;
  customAvailableText?: string;
}

export const MarginEditInput: React.FC<MarginEditInputProps> = ({
  title,
  sliderDisabled,
  margin,
  onMarginChange,
  errorMessage,
  minMargin,
  maxMargin,
  placeholder,
}) => {
  const { t } = useTranslation();
  const textColorClass =
    errorMessage && errorMessage.length
      ? 'text-r-red-default'
      : 'text-r-neutral-title-1';

  // 保存 slider 的百分比值，用于在 availableAmount 改变时保持 slider 位置
  const sliderPercentageRef = React.useRef<number | null>(null);
  const isSliderChangingRef = React.useRef<boolean>(false);

  // 当 margin 被外部重置为空时，清除 slider 百分比
  React.useEffect(() => {
    if (margin === '' && !isSliderChangingRef.current) {
      sliderPercentageRef.current = null;
    }
  }, [margin]);

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
    onMarginChange(value.toFixed(2));
  };

  return (
    <div className="bg-r-neutral-card1 rounded-[8px] mb-[12px] px-[16px] py-[16px]">
      <div className="text-[16px] leading-[19px] font-medium text-r-blue-default">
        {title}
      </div>
      <div className="flex items-start mb-[8px]">
        <div className="pt-[8px] flex flex-col items-center gap-[6px]">
          <div
            className={clsx(
              'text-[14px] leading-[18px] font-bold text-rb-brand-default',
              'px-[8px] py-[4px] rounded-[8px] bg-rb-brand-light-1',
              'cursor-pointer'
            )}
            onClick={() => {
              onMarginChange(minMargin.toString());
            }}
          >
            Min
          </div>
          <div className="text-rb-neutral-secondary text-[12px] leading-[16px] font-medium">
            {formatUsdValue(minMargin, PERPS_MARGIN_SIGNIFICANT_DIGITS)}
          </div>
        </div>
        <input
          className={clsx(
            'flex-1',
            'text-[32px] leading-[38px] font-bold bg-transparent border-none p-0 text-center',
            'w-full outline-none focus:outline-none',
            textColorClass
          )}
          style={{
            background: 'transparent',
            border: 'none',
            outline: 'none',
            boxShadow: 'none',
          }}
          placeholder={placeholder || '$0'}
          value={margin ? `$${margin}` : ''}
          onChange={handleChange}
        />
        <div className="pt-[8px] flex flex-col items-center gap-[6px]">
          <div
            className={clsx(
              'text-[14px] leading-[18px] font-bold text-rb-brand-default',
              'px-[8px] py-[4px] rounded-[8px] bg-rb-brand-light-1',
              'cursor-pointer'
            )}
            onClick={() => {
              onMarginChange(maxMargin.toString());
            }}
          >
            Max
          </div>
          <div className="text-rb-neutral-secondary text-[12px] leading-[16px] font-medium">
            {formatUsdValue(maxMargin, PERPS_MARGIN_SIGNIFICANT_DIGITS)}
          </div>
        </div>
      </div>

      <PerpsSlider
        disabled={sliderDisabled}
        value={Number(margin)}
        onValueChange={handleSliderChange}
        showPercentage={false}
        min={Number(minMargin)}
        max={maxMargin}
        step={0.1}
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
