import clsx from 'clsx';
import React from 'react';
import IconEmpty from '@/ui/assets/pending/empty.svg';

export const Empty = ({ className }: { className?: string }) => {
  return (
    <div
      className={clsx('flex items-center justify-center py-[100px]', className)}
    >
      <div className="text-center">
        <img src={IconEmpty} className="inline-block" alt="" />
        <div className="text-r-neutral-body text-[15px] leading-[18px] mt-[13px]">
          No data found
        </div>
      </div>
    </div>
  );
};
