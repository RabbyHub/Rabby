import { RcIconArrowRightCC } from '@/ui/assets/dashboard';
import clsx from 'clsx';
import React from 'react';

export const ExchangeSettingRow = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <div className="w-full flex items-center justify-between py-[16px] text-left first:pt-0 last:pb-0">
    <span className="text-[15px] leading-[18px] text-r-neutral-foot">
      {label}
    </span>
    <span
      className={clsx(
        'flex items-center gap-[8px] text-[15px] leading-[18px] text-r-neutral-title1',
        'cursor-pointer'
      )}
    >
      {value}
      <RcIconArrowRightCC className="w-[16px] h-[16px] text-r-neutral-foot" />
    </span>
  </div>
);
