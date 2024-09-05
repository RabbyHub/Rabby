import { ReactComponent as RcIconGasAccountBlue } from '@/ui/assets/gas-account/gas-account-blue.svg';
import { ReactComponent as RcIconGasAccountBlueBlur } from '@/ui/assets/gas-account/gas-account-blue-blur.svg';
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
      className={clsx('w-[60px] h-[60px] relative', props.className)}
    >
      <RcIconGasAccountBlueBlur className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      <RcIconGasAccountBlue className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
    </div>
  );
};
