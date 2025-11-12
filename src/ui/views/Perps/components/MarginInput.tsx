import React from 'react';
import BigNumber from 'bignumber.js';
import { formatUsdValue } from '@/ui/utils';
import { PerpsSlider } from '../components/PerpsSlider';
import { useTranslation } from 'react-i18next';

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

  const sliderPercentage = React.useMemo(() => {
    const marginValue = Number(margin) || 0;
    if (marginValue === 0 || availableAmount === 0) {
      return 0;
    }
    return Math.min(Math.ceil((marginValue / availableAmount) * 100), 100);
  }, [margin, availableAmount]);

  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    let value = e.target.value;
    if (value.startsWith('$')) {
      value = value.slice(1);
    }
    if (/^\d*\.?\d*$/.test(value) || value === '') {
      onMarginChange(value);
    }
  };

  const handleSliderChange = (value: number) => {
    const newMargin = (availableAmount * value) / 100;
    onMarginChange(
      new BigNumber(newMargin).decimalPlaces(2, BigNumber.ROUND_DOWN).toFixed()
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
        onValueChange={handleSliderChange}
        showPercentage
      />
    </div>
  );
};
