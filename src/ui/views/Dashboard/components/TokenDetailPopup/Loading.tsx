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
          <div className="token-txs-history-loading" key={index}>
            <Skeleton.Button
              active={active}
              className="h-14 mb-12 block"
              style={{ width: 98 }}
            ></Skeleton.Button>
            <Skeleton.Button
              active={active}
              className="h-[32px] block"
              style={{ width: 180 }}
            ></Skeleton.Button>
          </div>
        );
      })}
    </div>
  );
};
