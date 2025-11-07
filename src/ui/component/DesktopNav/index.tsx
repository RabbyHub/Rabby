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
    <div className="flex">
      <div
        className={clsx(
          'flex items-center gap-[16px] rounded-[20px] px-[12px] py-[10px]',
          'border-[1px] border-solid border-rb-neutral-bg-2',
          'bg-rb-neutral-bg-3'
        )}
      >
        <div
          className={clsx(
            'flex items-center gap-[6px] py-[8px] px-[12px] min-w-[150px] rounded-[14px] cursor-pointer',
            'text-r-neutral-title2'
          )}
          style={{
            background: 'linear-gradient(267deg, #5A71FF 1.05%, #384ABA 98.9%)',
          }}
        >
          <RcIconHomeCC className="flex-shrink-0" />
          <div className="min-w-0">
            <div className="text-[16px] leading-[19px] font-bold">
              Portfolio
            </div>
            {isLoading ? (
              <Skeleton.Input
                className="w-[96px] h-[14px] rounded-[2px] block"
                active
              />
            ) : (
              <div className="text-[12px] leading-[14px] flex items-center gap-[4px]">
                <div className="truncate">
                  ${splitNumberByStep((balance || 0).toFixed(2))}
                </div>
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
            'flex items-center gap-[6px] py-[8px] px-[12px] min-w-[150px] rounded-[14px] cursor-pointer'
          )}
        >
          <RcIconPerpsCC className="text-rb-neutral-secondary" />
          <div>
            <div className="text-rb-neutral-foot text-[16px] leading-[19px] font-bold">
              Perps
            </div>
            <div className="text-rb-neutral-secondary text-[12px] leading-[14px]">
              Coming Soon
            </div>
          </div>
        </div>
        <div
          className={clsx(
            'flex items-center gap-[6px] py-[8px] px-[12px] min-w-[150px] rounded-[14px] cursor-pointer'
          )}
        >
          <RcIconLeadingCC className="text-rb-neutral-secondary" />
          <div>
            <div className="text-rb-neutral-foot text-[16px] leading-[19px] font-bold">
              Lending
            </div>
            <div className="text-rb-neutral-secondary text-[12px] leading-[14px]">
              Coming Soon
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
