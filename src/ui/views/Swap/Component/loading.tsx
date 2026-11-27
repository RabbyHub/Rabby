import { DEX } from '@/constant';
import { Skeleton } from 'antd';
import clsx from 'clsx';
import React from 'react';
import { useSwapStore } from '@/ui/state/swap';

type QuoteListLoadingProps = {
  fetchedList?: string[];
};

export const QuoteLoading = ({
  logo,
  name,
}: {
  logo: string;
  name: string;
}) => {
  return (
    <div
      className={clsx(
        'h-[88px] flex items-center px-16 rounded-[6px]',
        'border-solid border border-rabby-neutral-line'
      )}
    >
      <div className="flex flex-col gap-10">
        <div className="flex items-center gap-4">
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
            width: 90,
            height: 16,
          }}
        />
      </div>

      <div className="ml-auto gap-12 flex flex-col items-end">
        <Skeleton.Input
          active
          style={{
            borderRadius: '2px',
            width: 132,
            height: 20,
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

export const QuoteListLoading = ({
  fetchedList: dataList,
}: QuoteListLoadingProps) => {
  const supportedDEXList = useSwapStore((s) => s.supportedDEXList);
  return (
    <>
      {Object.entries(DEX).map(([key, value]) => {
        if (
          !supportedDEXList.includes(key) ||
          (dataList && dataList.includes(key))
        )
          return null;
        return <QuoteLoading logo={value.logo} key={key} name={value.name} />;
      })}
    </>
  );
};
