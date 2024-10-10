import clsx from 'clsx';
import React from 'react';
import { ReactComponent as RcIconCloseCC } from 'ui/assets/component/close-cc.svg';

export const GasAccountCloseIcon = ({
  className,
  ...others
}: React.SVGProps<SVGSVGElement>) => (
  <RcIconCloseCC
    {...others}
    className={clsx('w-[20px] h-[20px] text-r-neutral-foot mt-4', className)}
  />
);
