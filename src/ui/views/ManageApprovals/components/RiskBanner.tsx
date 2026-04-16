import React from 'react';
import { WarningFilled } from '@ant-design/icons';
import { ReactComponent as RcIconWaringCC } from '@/ui/assets/warning-cc.svg';
import clsx from 'clsx';

type RiskBannerProps = {
  text?: string;
  className?: string;
};

export const RiskBanner: React.FC<RiskBannerProps> = ({ text, className }) => {
  if (!text) {
    return null;
  }

  return (
    <div
      className={clsx(
        'flex items-center gap-[4px] p-[8px]',
        'rounded-[8px] bg-[#FFD9D5]',
        'text-r-red-default',
        className
      )}
    >
      <RcIconWaringCC className="flex-shrink-0" />
      <span className="text-[12px] leading-[14px] font-medium">{text}</span>
    </div>
  );
};
