import {
  RcIconHomeCC,
  RcIconLeadingCC,
  RcIconPerpsCC,
} from '@/ui/assets/desktop/nav';
import clsx from 'clsx';
import React from 'react';

export const DesktopNav = () => {
  return (
    <div className="flex items-center gap-[16px]">
      <div
        className={clsx(
          'flex items-start gap-[8px] py-[14px] px-[20px] w-[200px] rounded-[8px] cursor-pointer',
          'text-r-neutral-title2 bg-r-blue-default'
        )}
      >
        <RcIconHomeCC />
        <div>
          <div className="text-r-neutral-title2 text-[18px] leading-[20px] font-medium">
            Portfolio
          </div>
          <div className="text-r-neutral-title2 text-[13px] leading-[16px]">
            $318,141 <span>+2.1%</span>
          </div>
        </div>
      </div>
      <div
        className={clsx(
          'flex items-start gap-[8px] py-[14px] px-[20px] w-[200px] rounded-[8px]',
          'text-r-neutral-foot bg-r-neutral-card1 opacity-90'
        )}
      >
        <RcIconPerpsCC />
        <div>
          <div className="text-r-neutral-foot text-[18px] leading-[20px] font-medium">
            Perps
          </div>
          <div className="text-r-neutral-foot text-[13px] leading-[16px] opacity-70">
            Coming Soon
          </div>
        </div>
      </div>
      <div
        className={clsx(
          'flex items-start gap-[8px] py-[14px] px-[20px] w-[200px] rounded-[8px]',
          'text-r-neutral-foot bg-r-neutral-card1 opacity-90'
        )}
      >
        <RcIconLeadingCC />
        <div>
          <div className="text-r-neutral-foot text-[18px] leading-[20px] font-medium">
            Lending
          </div>
          <div className="text-r-neutral-foot text-[13px] leading-[16px] opacity-70">
            Coming Soon
          </div>
        </div>
      </div>
    </div>
  );
};
