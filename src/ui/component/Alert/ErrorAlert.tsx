import clsx from 'clsx';
import React from 'react';

interface ErrorAlertProps extends React.HTMLAttributes<HTMLDivElement> {
  description?: string;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({
  children,
  className,
}) => {
  return (
    <div
      className={clsx(
        'bg-[#F248221A] border-[#EC5151] border text-[#EC5151] py-12 px-16 rounded text-14',
        className
      )}
    >
      {children}
    </div>
  );
};
