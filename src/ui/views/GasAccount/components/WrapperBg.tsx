import React from 'react';
import { ReactComponent as RcIconBg } from '@/ui/assets/gas-account/bg.svg';
import clsx from 'clsx';

export const GasAccountWrapperBg = ({
  children,
  className,
  ...others
}: React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLDivElement>,
  HTMLDivElement
>) => {
  return (
    <div {...others} className={clsx('relative', className)}>
      <RcIconBg className="absolute left-1/2 top-0 -translate-x-1/2" />
      {children}
    </div>
  );
};
