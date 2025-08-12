import React from 'react';
import { ReactComponent as LedgerBannerArrowSVG } from '@/ui/assets/ledger/button-arrow-cc.svg';
import clsx from 'clsx';

interface Props {
  className?: string;
}
export const TrezorBanner: React.FC<Props> = ({ className }) => {
  return (
    <div className={className}>
      <div
        className={clsx(
          'bg-r-neutral-card-2 rounded-[12px]',
          'w-[800px] h-[100px] px-[50px]',
          'flex items-center justify-between'
        )}
      ></div>
    </div>
  );
};
