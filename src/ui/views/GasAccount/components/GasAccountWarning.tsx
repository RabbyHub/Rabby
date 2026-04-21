import React from 'react';
import { ReactComponent as RcIconWarning } from '@/ui/assets/sign/tx/warning-2.svg';

export const GasAccountWarning: React.FC<{
  message: string;
}> = ({ message }) => {
  return (
    <div className="mb-12 flex items-start gap-8 rounded-[10px] border border-solid border-[#FFD089] bg-r-orange-light px-12 py-10 text-13 font-medium leading-[18px] text-r-orange-default">
      <RcIconWarning width={14} height={14} className="mt-[1px] shrink-0" />
      <span>{message}</span>
    </div>
  );
};
