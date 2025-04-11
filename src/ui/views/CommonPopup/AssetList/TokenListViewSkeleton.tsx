import { Skeleton } from 'antd';
import React from 'react';

const TokenItemSkeleton: React.FC = () => {
  return (
    <div className="flex justify-between bg-r-neutral-card-1 rounded-[8px] items-center py-10 pl-12 pr-16 h-[60px]">
      <div className="gap-x-12 flex items-center">
        <Skeleton.Input
          active
          className="rounded-full w-[32px] h-[32px] bg-r-neutral-card-2"
        />
        <div className="gap-y-2 flex flex-col">
          <Skeleton.Input
            active
            className="bg-r-neutral-card-2 rounded-[2px] w-[72px] h-[15px]"
          />
          <Skeleton.Input
            active
            className="bg-r-neutral-card-2 rounded-[2px] w-[44px] h-[10px]"
          />
        </div>
      </div>
      <div>
        <Skeleton.Input
          active
          className="bg-r-neutral-card-2 rounded-[2px] w-[72px] h-[20px]"
        />
      </div>
      <div>
        <Skeleton.Input
          active
          className="bg-r-neutral-card-2 rounded-[2px] w-[72px] h-[20px]"
        />
      </div>
    </div>
  );
};

export const TokenListSkeleton = () => {
  return (
    <div className="mt-20 gap-8 flex flex-col">
      {Array.from({ length: 6 }).map((_, index) => (
        <TokenItemSkeleton key={index} />
      ))}
    </div>
  );
};

export const TokenListViewSkeleton: React.FC<{
  isTestnet?: boolean;
}> = ({ isTestnet }) => {
  return (
    <div className="mt-16">
      <div className="flex">
        <Skeleton.Input
          active
          className="bg-r-neutral-card-2 rounded-[6px] w-[160px] h-[32px] mr-[auto]"
        />
        {isTestnet ? (
          <div className="flex gap-[12px] items-center">
            <Skeleton.Input
              active
              className="bg-r-neutral-card-2 rounded-[6px] w-[82px] h-[32px] "
            />
            <Skeleton.Input
              active
              className="bg-r-neutral-card-2 rounded-[6px] w-[82px] h-[32px] "
            />
          </div>
        ) : (
          <Skeleton.Input
            active
            className="bg-r-neutral-card-2 rounded-[6px] w-[100px] h-[32px] "
          />
        )}
      </div>
      <TokenListSkeleton />
    </div>
  );
};
