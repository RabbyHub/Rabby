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
  return (
    <div
      className={clsx(
        'flex-1 p-12 h-[48px] flex item-center rounded-[6px]',
        isCex ? '' : 'border-solid border border-gray-divider'
      )}
    >
      <QuoteLogo isLoading={true} logo={logo} />
      <span className="ml-[8px] text-13 font-medium text-gray-title flex items-center ">
        {name}
      </span>
      <div className="ml-auto gap-[48px] flex  justify-between items-center">
        <Skeleton.Input
          active
          style={{
            borderRadius: '2px',
            width: 90,
            height: 20,
          }}
        />

        <Skeleton.Input
          active
          style={{
            borderRadius: '2px',
            width: 57,
            height: 20,
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
