import { RcIconArrowRightCC } from '@/ui/assets/dashboard';
import clsx from 'clsx';
import React from 'react';

export const ExchangeSettingRow = ({
  label,
  value,
  isShowArrow = false,
  onClick,
}: {
  label: string;
  value?: React.ReactNode;
  isShowArrow?: boolean;
  onClick?: () => void;
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
      onClick={onClick}
    >
      {value}
      {isShowArrow ? (
        <RcIconArrowRightCC className="w-[16px] h-[16px] text-r-neutral-foot" />
      ) : null}
    </span>
  </div>
);
