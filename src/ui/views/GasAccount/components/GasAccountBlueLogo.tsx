import { ReactComponent as RcIconGasAccountBlue } from '@/ui/assets/gas-account/gas-account-blue-combined.svg';
import React from 'react';
import clsx from 'clsx';

export const GasAccountBlueLogo = (
  props: React.DetailedHTMLProps<
    React.HTMLAttributes<HTMLDivElement>,
    HTMLDivElement
  >
) => {
  return (
    <div
      {...props}
      className={clsx('relative overflow-visible', props.className)}
    >
      <RcIconGasAccountBlue className="absolute left-1/2 top-1/2 h-[65px] w-[92px] -translate-x-1/2 -translate-y-1/2" />
    </div>
  );
};
