import { CEX, DEX } from '@/constant';
import { Skeleton } from 'antd';
import clsx from 'clsx';
import React from 'react';
import { QuoteLogo } from './QuoteLogo';
import { useSwapSettings } from '../hooks';

type QuoteListLoadingProps = {
  fetchedList?: string[];
  isCex?: boolean;
};

export const QuoteLoading = ({
  logo,
  name,
  isCex = false,
}: {
  logo: string;
  name: string;
  isCex?: boolean;
}) => {
  if (isCex)
    return (
      <div
        className={clsx(
          'flex-1 px-16 h-[44px] flex items-center rounded-[6px]'
        )}
      >
        <QuoteLogo isLoading={true} logo={logo} />
        <span className="ml-[8px] text-13 font-medium text-r-neutral-title-1 flex items-center">
          {name}
        </span>
        <div className="ml-auto flex items-center">
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
  return (
    <div
      className={clsx(
        'h-[80px] flex items-center px-16 rounded-[6px]',
        'border-solid border border-rabby-neutral-line'
      )}
    >
      <div className="flex flex-col gap-10">
        <div className="flex items-center" gap-4>
          <QuoteLogo isLoading={true} logo={logo} loaded />
          <span className="ml-[8px] text-16 font-medium text-r-neutral-title-1">
            {name}
          </span>
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
  isCex,
}: QuoteListLoadingProps) => {
  const { swapViewList } = useSwapSettings();
  return (
    <>
      {Object.entries(isCex ? CEX : DEX).map(([key, value]) => {
        if (
          (dataList && dataList.includes(key)) ||
          swapViewList?.[key] === false
        )
          return null;
        return (
          <QuoteLoading
            logo={value.logo}
            key={key}
            name={value.name}
            isCex={isCex}
          />
        );
      })}
    </>
  );
};
