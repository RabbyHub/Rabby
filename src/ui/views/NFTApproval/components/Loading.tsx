import { Skeleton } from 'antd';
import React from 'react';

export const Loading = () => (
  <div className="pl-[10px] pr-[25px]">
    {Array(7)
      .fill(1)
      .map((_, i) => (
        <div key={i} className="flex justify-between items-center mb-[16px]">
          <div className="flex flex-col">
            <Skeleton.Input
              active
              style={{
                width: 139,
                height: 15,
                marginBottom: 2,
              }}
            />
            <Skeleton.Input
              active
              style={{
                width: 59,
                height: 14,
              }}
            />
          </div>
          <div className="flex flex-col items-end">
            <Skeleton.Input
              active
              style={{
                width: 123,
                height: 15,
                marginBottom: 2,
              }}
            />
            <Skeleton.Input
              active
              style={{
                width: 59,
                height: 14,
              }}
            />
          </div>
        </div>
      ))}
  </div>
);
