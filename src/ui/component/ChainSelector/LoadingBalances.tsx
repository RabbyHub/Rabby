import React from 'react';
import clsx from 'clsx';

import { ReactComponent as RcLoadingCC } from './icons/loading-cc.svg';
import { Skeleton } from 'antd';

type LoadingProps = {
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  loading?: boolean;
};
export function GlobalLoading({
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
        backgroundColor: 'rgba(var(--r-neutral-bg1-rgb), 0.5)',
        backdropFilter: 'blur(2px)',
      }}
    >
      <RcLoadingCC className="text-r-neutral-body w-[16px] h-[16px] mx-auto mb-[12px] animate-spin" />
      {children && (
        <div className="font-[14px] leading-[16px] text-r-neutral-body">
          {children}
        </div>
      )}
    </div>
  );
}
export function LoadingBalances({ loading }: LoadingProps) {
  if (!loading) return null;

  return (
    <div className="bg-r-neutral-card2 rounded-[6px] overflow-hidden">
      {Array.from({ length: 10 }).map((_, index) => (
        <div
          key={`loading-${index}`}
          className="bg-r-neutral-card2 rounded-[6px] h-[56px] flex items-center justify-start px-[16px]"
        >
          <Skeleton.Avatar
            active
            shape="circle"
            size={28}
            className="rounded-[50%] w-[28px] h-[28px] bg-r-neutral-line"
          />
          <div className="ml-[12px] w-[108px] h-[28px]">
            <Skeleton.Input
              active
              className="w-[100%] h-[100%] rounded-[4px] bg-r-neutral-line leading-normal"
            />
          </div>
        </div>
      ))}
    </div>
  );
}
