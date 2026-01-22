import React from 'react';
import { ReactComponent as RcFillWarningCC } from '@/ui/assets/fill-warning-cc.svg';
export const RiskRow = ({ desc }: { desc: string }) => {
  return (
    <div className="flex gap-[8px] px-[15px] py-[14px] bg-r-neutral-card1 rounded-[8px] items-center">
      <div className="icon text-r-orange-default">
        <RcFillWarningCC width={16} height={16} />
      </div>
      <div className="desc text-r-neutral-body text-[13px] font-medium">
        {desc}
      </div>
    </div>
  );
};
