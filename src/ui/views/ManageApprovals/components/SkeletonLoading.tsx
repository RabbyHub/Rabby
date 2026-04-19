import { Skeleton } from 'antd';
import { range } from 'lodash';
import React from 'react';

export const SkeletonLoading: React.FC = () => {
  return (
    <div className="flex flex-col gap-[8px]">
      {range(6).map((index) => (
        <div
          key={index}
          className="flex items-center gap-[12px] px-[12px] py-[14px] rounded-[8px] bg-r-neutral-card-1"
        >
          <div className="w-[18px] h-[18px] border border-rabby-neutral-foot opacity-30 rounded-full"></div>
          <Skeleton.Avatar active shape="circle" className="block" size={28} />
          <Skeleton.Button
            active
            className="w-[110px] h-[18px] rounded-[4px]"
          />
        </div>
      ))}
    </div>
  );
};
