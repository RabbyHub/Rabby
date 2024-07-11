import React from 'react';
import clsx from 'clsx';

import { ReactComponent as RcLoadingCC } from './icons/loading-cc.svg';

type LoadingProps = {
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  loading?: boolean;
};
export function LoadingBalances({
  className,
  style,
  children,
  loading,
}: LoadingProps) {
  if (!loading) return null;

  return (
    <div
      className={clsx(
        'text-center h-[100%] w-[100%] top-0 left-0 right-0 bottom-0 absolute pt-[200px] z-[11]',
        className
      )}
      style={{
        ...style,
        backgroundColor: 'rgba(var(--r-neutral-body-rgb), 0.5)',
      }}
    >
      <RcLoadingCC className="text-r-neutral-card2 w-[16px] h-[16px] mx-auto mb-[12px] animate-spin" />
      {children && (
        <div className="font-[14px] leading-[16px] text-r-neutral-card2">
          {children}
        </div>
      )}
    </div>
  );
}
