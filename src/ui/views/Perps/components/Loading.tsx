import React from 'react';
import { Skeleton } from 'antd';

interface PerpsLoadingProps {
  active?: boolean;
}

export const PerpsLoading = ({ active = true }: PerpsLoadingProps) => {
  return (
    <div className="mx-20">
      {/* 登录后的账户余额卡片骨架 */}
      <div className="bg-r-neutral-card1 rounded-[12px] px-16 py-16 flex flex-col items-center">
        <Skeleton.Button
          active={active}
          className="h-[40px] mb-8 block rounded-[8px]"
          style={{ width: 100 }}
        />
        <Skeleton.Button
          active={active}
          className="h-[20px] mb-8 block rounded-[8px]"
          style={{ width: 80 }}
        />
        <Skeleton.Button
          active={active}
          className="h-[16px] mb-24 block rounded-[8px]"
          style={{ width: 120 }}
        />
        {/* 按钮骨架 */}
        <div className="w-full flex gap-12 items-center justify-center">
          <Skeleton.Button
            active={active}
            className="h-[44px] w-[158px] flex-1 block rounded-[8px]"
          />
          <Skeleton.Button
            active={active}
            className="h-[44px] w-[158px] flex-1 block rounded-[8px]"
          />
        </div>
      </div>

      {/* 持仓列表骨架 */}
      <div className="mt-20">
        <Skeleton.Button
          active={active}
          className="h-[18px] mb-8 block rounded-[8px]"
          style={{ width: 80 }}
        />
        <div className="flex flex-col gap-8">
          {new Array(3).fill(null).map((_, index) => (
            <div
              key={index}
              className="bg-r-neutral-card1 rounded-[12px] p-16 flex justify-between items-center"
            >
              <div className="flex items-center gap-12">
                <Skeleton.Avatar active={active} size={32} shape="circle" />
                <div className="flex flex-col gap-4">
                  <Skeleton.Button
                    active={active}
                    className="h-[16px] block rounded-[8px]"
                    style={{ width: 80 }}
                  />
                  <Skeleton.Button
                    active={active}
                    className="h-[14px] block rounded-[8px]"
                    style={{ width: 60 }}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-4 items-end">
                <Skeleton.Button
                  active={active}
                  className="h-[16px] block rounded-[8px]"
                  style={{ width: 80 }}
                />
                <Skeleton.Button
                  active={active}
                  className="h-[14px] block rounded-[8px]"
                  style={{ width: 60 }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 探索Perps骨架 */}
      <div className="mt-20">
        <div className="flex justify-between mb-8">
          <Skeleton.Button
            active={active}
            className="h-[18px] block rounded-[8px]"
            style={{ width: 60 }}
          />
          <Skeleton.Button
            active={active}
            className="h-[18px] block rounded-[8px]"
            style={{ width: 60 }}
          />
        </div>
        <div className="bg-r-neutral-card1 rounded-[12px] flex flex-col">
          {new Array(1).fill(null).map((_, index) => (
            <div key={index} className="p-16">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-12">
                  <Skeleton.Avatar active={active} size={32} shape="circle" />
                  <div className="flex flex-col gap-4">
                    <Skeleton.Button
                      active={active}
                      className="h-[16px] block rounded-[8px]"
                      style={{ width: 80 }}
                    />
                    <Skeleton.Button
                      active={active}
                      className="h-[14px] block rounded-[8px]"
                      style={{ width: 60 }}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-4 items-end">
                  <Skeleton.Button
                    active={active}
                    className="h-[16px] block rounded-[8px]"
                    style={{ width: 80 }}
                  />
                  <Skeleton.Button
                    active={active}
                    className="h-[14px] block rounded-[8px]"
                    style={{ width: 60 }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
