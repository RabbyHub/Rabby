import {
  RcIconHomeCC,
  RcIconLeadingCC,
  RcIconPerpsCC,
} from '@/ui/assets/desktop/nav';
import { splitNumberByStep } from '@/ui/utils';
import { Skeleton } from 'antd';
import clsx from 'clsx';
import React from 'react';

export const DesktopNav: React.FC<{
  balance?: number | null;
  changePercent?: string | null;
  isLoss?: boolean;
  isLoading?: boolean;
}> = ({ balance, changePercent, isLoss, isLoading }) => {
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
          {isLoading ? (
            <Skeleton.Input
              className="w-[96px] h-[16px] rounded-[2px] block"
              active
            />
          ) : (
            <div className="text-r-neutral-title2 text-[13px] leading-[16px]">
              ${splitNumberByStep((balance || 0).toFixed(2))}{' '}
              {changePercent ? (
                <span
                  className={clsx(
                    isLoss ? 'text-r-red-default' : 'text-[#17FFAA]'
                  )}
                >
                  {isLoss ? '-' : '+'}
                  {changePercent}
                </span>
              ) : null}
            </div>
          )}
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
