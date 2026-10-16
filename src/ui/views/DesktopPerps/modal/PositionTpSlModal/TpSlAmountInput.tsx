import { Slider } from 'antd';
import clsx from 'clsx';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ThousandsNativeInput } from '../../components/ThousandsNativeInput';

const MARKS = { 0: ' ', 25: ' ', 50: ' ', 75: ' ', 100: ' ' };

interface TpSlAmountInputProps {
  source: 'slider' | 'manual';
  percent: number;
  /** Size the slider selects, formatted in the active unit. */
  sliderAmountText: string;
  inputValue: string;
  unitLabel: string;
  /** Whole position, formatted in the active unit. */
  positionAmountText: string;
  titleSize?: 'default' | 'large';
  disabled?: boolean;
  hasError?: boolean;
  onBeginManual: () => void;
  onInputChange: (value: string) => void;
  onPercentChange: (percent: number) => void;
}

export const TpSlAmountInput: React.FC<TpSlAmountInputProps> = ({
  source,
  percent,
  sliderAmountText,
  inputValue,
  unitLabel,
  positionAmountText,
  titleSize = 'default',
  disabled,
  hasError,
  onBeginManual,
  onInputChange,
  onPercentChange,
}) => {
  const { t } = useTranslation();
  const sliderText = `${percent}% (${
    percent === 100 ? '' : '≈'
  }${sliderAmountText})`;

  return (
    <section className="flex flex-col gap-[12px]">
      <div
        className={clsx(
          'font-medium text-rb-neutral-title-1',
          titleSize === 'large'
            ? 'text-[16px] leading-[18px]'
            : 'text-[14px] leading-[18px]'
        )}
      >
        {t('page.perpsPro.positionTpSl.amount')}
      </div>
      <div
        className={clsx(
          'flex h-[40px] items-center gap-[8px] rounded-[6px] border border-solid bg-rb-neutral-bg-5 px-[12px]',
          'hover:border-rb-brand-default focus-within:border-rb-brand-default',
          hasError ? 'border-rb-red-default' : 'border-transparent'
        )}
      >
        {source === 'slider' ? (
          // Display-only while the slider drives the amount; focusing it hands
          // control to typing (the slider drops to 0, per the PRD).
          <input
            type="text"
            readOnly
            value={sliderText}
            disabled={disabled}
            onFocus={onBeginManual}
            className="min-w-0 flex-1 cursor-text border-0 bg-transparent p-0 text-[15px] leading-[18px] text-rb-neutral-title-1 outline-none"
          />
        ) : (
          <ThousandsNativeInput
            autoFocus
            value={inputValue}
            inputMode="decimal"
            disabled={disabled}
            onChange={(e) => onInputChange(e.target.value)}
            className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[15px] leading-[18px] text-rb-neutral-title-1 outline-none"
          />
        )}
        <span className="shrink-0 text-[15px] leading-[18px] text-rb-neutral-title-1">
          {unitLabel}
        </span>
      </div>
      <div className="flex flex-col gap-[6px]">
        <Slider
          className="desktop-perps-tpsl-slider"
          min={0}
          max={100}
          step={1}
          marks={MARKS}
          value={source === 'slider' ? percent : 0}
          tipFormatter={null}
          disabled={disabled}
          onChange={(value: number) => onPercentChange(value)}
        />
        <div className="text-[12px] leading-[16px] text-rb-neutral-secondary">
          {t('page.perpsPro.positionTpSl.positionAmount', {
            amount: positionAmountText,
            unit: unitLabel,
          })}
        </div>
      </div>
    </section>
  );
};
