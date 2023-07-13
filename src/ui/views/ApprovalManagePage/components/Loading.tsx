import { Skeleton } from 'antd';
import React from 'react';

export const Loading = () => (
  <div>
    {Array(7)
      .fill(1)
      .map((_, i) => (
        <div
          key={i}
          className="flex items-center pl-[16px] mb-[12px] bg-white h-[65px] rounded-[6px]"
        >
          <Skeleton.Avatar
            style={{
              width: 32,
              height: 32,
              marginRight: 12,
            }}
          />
          <div className="flex flex-col">
            <Skeleton.Input
              active
              style={{
                width: 108,
                height: 15,
                marginBottom: 2,
              }}
            />
            <Skeleton.Input
              active
              style={{
                width: 100,
                height: 15,
              }}
            />
          </div>
        </div>
      ))}
  </div>
);
