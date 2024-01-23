import { Skeleton } from 'antd';
import React from 'react';

export const Loading = () => {
  return (
    <>
      <div
        style={{
          boxShadow: '0px 10px 10px 0px rgba(0, 0, 0, 0.2)',
        }}
        className="w-[360px] h-[448px] mt-[40px] flex flex-col items-center relative bg-r-neutral-bg1 rounded-[8px]"
      >
        <div className="mt-24">
          <Skeleton.Input
            active
            className="rounded-[4px] bg-r-neutral-card2 w-[214px] h-[36px]"
          />
        </div>
        <div className="h-[0.5px] w-[312px] bg-r-neutral-line mt-[40px] mb-[38px]" />

        <Skeleton.Input
          active
          className="bg-r-neutral-card2 w-[240px] h-[40px]"
        />

        <div className="mt-[18px] mb-[14px]">
          <Skeleton.Avatar shape="circle" size={52} active />
        </div>

        <div className="mb-[58px]">
          <Skeleton.Input
            active
            className="bg-r-neutral-card2 w-[100px] h-[28px]"
          />
        </div>

        <Skeleton.Input
          active
          className="bg-r-neutral-card2 w-[184px] h-[42px]"
        />
      </div>
    </>
  );
};
