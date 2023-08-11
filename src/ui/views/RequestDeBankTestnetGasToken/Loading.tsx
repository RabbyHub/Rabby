import { Skeleton } from 'antd';
import React from 'react';

export const Loading = () => {
  return (
    <>
      <div
        style={{
          boxShadow: '0px 24px 40px 0px rgba(0, 0, 0, 0.08)',
        }}
        className="w-[360px] h-[448px] mt-[40px] flex flex-col items-center relative bg-white rounded-[8px]"
      >
        <div className="mt-24">
          <Skeleton.Input
            active
            className="rounded-[4px] bg-gray-bg w-[214px] h-[36px]"
          />
        </div>
        <div className="h-[0.5px] w-[312px] bg-[#D3D8E0] mt-[40px] mb-[38px]" />

        <Skeleton.Input active className="bg-gray-bg w-[240px] h-[40px]" />

        <div className="mt-[18px] mb-[14px]">
          <Skeleton.Avatar shape="circle" size={52} active />
        </div>

        <div className="mb-[58px]">
          <Skeleton.Input active className="bg-gray-bg w-[100px] h-[28px]" />
        </div>

        <Skeleton.Input active className="bg-gray-bg w-[184px] h-[42px]" />
      </div>
    </>
  );
};
