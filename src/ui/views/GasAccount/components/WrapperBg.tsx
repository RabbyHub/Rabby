import React from 'react';
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
      {children}
    </div>
  );
};
