import React from 'react';
import { ReactComponent as RcIconWarning } from '@/ui/assets/gas-account/warning.svg';

export const GasAccountWarning: React.FC<{
  message: string;
}> = ({ message }) => {
  return (
    <div className="mb-12 flex items-start gap-8 rounded-[10px] border border-solid border-[#FFD089] bg-r-orange-light px-12 py-10 text-13 font-medium leading-[18px] text-r-orange-default">
      <RcIconWarning
        viewBox="0 0 14 14"
        className="mt-[2px] min-w-[14px] w-14 h-14 shrink-0"
      />
      <span>{message}</span>
    </div>
  );
};
