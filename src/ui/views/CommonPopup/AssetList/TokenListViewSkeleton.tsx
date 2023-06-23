import { Skeleton } from 'antd';
import React from 'react';

const TokenItemSkeleton: React.FC = () => {
  return (
    <div className="flex justify-between items-center py-10">
      <div className="gap-x-12 flex">
        <Skeleton.Input
          active
          className="rounded-full w-[24px] h-[24px] bg-gray-bg"
        />
        <div className="gap-y-2 flex flex-col">
          <Skeleton.Input
            active
            className="bg-gray-bg rounded-[2px] w-[112px] h-[15px]"
          />
          <Skeleton.Input
            active
            className="bg-gray-bg rounded-[2px] w-[58px] h-[10px]"
          />
        </div>
      </div>
      <div>
        <Skeleton.Input
          active
          className="bg-gray-bg rounded-[2px] w-[84px] h-[20px]"
        />
      </div>
    </div>
  );
};

export const TokenListSkeleton = () => {
  return (
    <div className="mt-20">
      {Array.from({ length: 6 }).map((_, index) => (
        <TokenItemSkeleton key={index} />
      ))}
    </div>
  );
};

export const TokenListViewSkeleton: React.FC = () => {
  return (
    <div className="mt-16">
      <div className="flex justify-between">
        <Skeleton.Input
          active
          className="bg-gray-bg rounded-[6px] w-[160px] h-[32px]"
        />
        <Skeleton.Input
          active
          className="bg-gray-bg rounded-[6px] w-[100px] h-[32px]"
        />
      </div>
      <TokenListSkeleton />
    </div>
  );
};
