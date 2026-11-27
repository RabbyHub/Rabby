import React from 'react';
import { Skeleton } from 'antd';

type LoadingProps = {
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  loading?: boolean;
};
export function LoadingBalances({ loading }: LoadingProps) {
  if (!loading) return null;

  return (
    <div className="bg-r-neutral-card2 rounded-[6px] overflow-hidden">
      {Array.from({ length: 3 }).map((_, index) => (
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
