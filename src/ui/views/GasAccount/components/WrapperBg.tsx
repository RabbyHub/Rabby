import React from 'react';
import clsx from 'clsx';

export const GasAccountWrapperBg = ({
  children,
  className,
  hideBackground,
  ...others
}: React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLDivElement>,
  HTMLDivElement
> & {
  hideBackground?: boolean;
}) => {
  return (
    <div {...others} className={clsx('relative overflow-hidden', className)}>
      {children}
    </div>
  );
};
