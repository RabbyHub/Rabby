import React from 'react';
import { Skeleton } from 'antd';

interface LoadingProps {
  active?: boolean;
  count?: number;
}
export const Loading = ({ count = 1, active = false }: LoadingProps) => {
  return (
    <div>
      {new Array(count).fill(null).map((_, index) => {
        return (
          <div className="txs-history-loading" key={index}>
            <Skeleton.Button
              active={active}
              className="h-14 mb-12 block"
              style={{ width: 161 }}
            ></Skeleton.Button>
            <Skeleton.Button
              active={active}
              className="h-[18px] mb-16 block"
              style={{ width: 225 }}
            ></Skeleton.Button>
            <Skeleton.Button
              active={active}
              className="h-14 block"
              style={{ width: 161 }}
            ></Skeleton.Button>
          </div>
        );
      })}
    </div>
  );
};
