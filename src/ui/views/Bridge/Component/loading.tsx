import { Skeleton } from 'antd';
import clsx from 'clsx';
import React from 'react';

export const QuoteLoading = () => {
  return (
    <div
      className={clsx(
        'h-[88px] flex flex-col justify-center gap-10 px-16 rounded-[6px]',
        'border-solid border-[1px] border-rabby-neutral-line'
      )}
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-8">
          <Skeleton.Avatar active size={24} shape="circle" />
          <Skeleton.Input
            active
            style={{
              borderRadius: '2px',
              width: 70,
              height: 18,
            }}
          />
        </div>

        <Skeleton.Input
          active
          style={{
            borderRadius: '2px',
            width: 132,
            height: 18,
          }}
        />
      </div>

      <div className="flex items-center justify-between">
        <Skeleton.Input
          active
          style={{
            borderRadius: '2px',
            width: 90,
            height: 16,
          }}
        />
        <Skeleton.Input
          active
          style={{
            borderRadius: '2px',
            width: 90,
            height: 16,
          }}
        />
      </div>
    </div>
  );
};

export const TokenPairLoading = () => {
  return (
    <div className="px-20 min-h-[56px] flex items-center justify-between">
      <div className="flex items-center gap-12">
        <Skeleton.Avatar active size={24} shape="circle" />
        <Skeleton.Input
          active
          style={{
            borderRadius: '2px',
            width: 84,
            height: 18,
          }}
        />
      </div>
      <Skeleton.Input
        active
        style={{
          borderRadius: '2px',
          width: 74,
          height: 18,
        }}
      />
    </div>
  );
};
