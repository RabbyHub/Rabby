import React from 'react';
import BigNumber from 'bignumber.js';
import { formatUsdValue } from '@/ui/utils';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { RcIconInfoCC } from '@/ui/assets/desktop/common';
import { useMemoizedFn } from 'ahooks';
import { DesktopPerpsSlider } from '../../DesktopPerpsSlider';

interface LeverageInputProps {
  title: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  min: number;
  max: number;
  step?: number;
  errorMessage?: string | null;
}

export const LeverageInput: React.FC<LeverageInputProps> = ({
  title,
  value,
  min,
  max,
  step,
  onChange,
  errorMessage,
}) => {
  const { t } = useTranslation();
  const textColorClass =
    errorMessage && errorMessage.length
      ? 'text-r-red-default'
      : 'text-r-neutral-title-1';

  const handleChange = useMemoizedFn<
    React.ChangeEventHandler<HTMLInputElement>
  >((e) => {
    const val = e.target.value;
    const nextVal = +val;

    if (Number.isNaN(nextVal) || val === '') {
      onChange(undefined);
    } else {
      onChange(nextVal);
    }
  });

  return (
    <div className="bg-r-neutral-card1 rounded-[8px] mb-[12px] px-[16px] py-[16px]">
      <div className="text-[16px] leading-[19px] font-medium text-r-blue-default">
        {title}
      </div>
      <div className="flex items-center mb-[8px]">
        <div className="flex items-end gap-[6px]">
          <div className="text-[13px] leading-[16px] text-r-neutral-foot pb-[2px]">
            {t('page.perpsDetail.PerpsEditMarginPopup.upTo')}
          </div>
          <div className="text-[20px] leading-[24px] font-medium text-r-neutral-title-1">
            {max}x
          </div>
        </div>
        <div className="flex-1 flex items-center">
          <input
            className={clsx(
              'flex-1',
              'text-[32px] leading-[38px] font-bold bg-transparent border-none p-0 text-right',
              'w-full outline-none focus:outline-none',
              'placeholder-r-neutral-foot',
              errorMessage?.length
                ? 'text-r-red-default'
                : 'text-r-neutral-title-1'
            )}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              boxShadow: 'none',
            }}
            placeholder="0"
            value={value == null ? '' : value}
            onChange={handleChange}
            // onBlur={() => {
            //   if ((value || 0) < min) {
            //     onChange(min);
            //   }
            // }}
          />
          <div
            className={clsx(
              'text-[32px] leading-[38px] font-bold',
              value == null
                ? 'text-r-neutral-foot'
                : errorMessage?.length
                ? 'text-r-red-default'
                : 'text-r-neutral-title-1'
            )}
          >
            x
          </div>
        </div>
      </div>

      <DesktopPerpsSlider
        value={value ?? 1}
        onChange={onChange}
        step={step}
        min={min}
        max={max}
      />
      {
        <div className="bg-r-orange-light rounded-[8px] px-[12px] py-[8px] flex items-center gap-[4px] mt-[14px]">
          <RcIconInfoCC className="text-r-orange-default" />
          <div className="text-center text-[12px] leading-[14px] text-r-orange-default">
            {errorMessage || t('page.perpsPro.leverage.higherLeverageRisk')}
          </div>
        </div>
      }
    </div>
  );
};
