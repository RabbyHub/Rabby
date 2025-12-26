import { useRabbySelector } from '@/ui/store';
import { splitNumberByStep } from '@/ui/utils';
import { UserFunding } from '@rabby-wallet/hyperliquid-sdk';
import { ColumnType } from 'antd/lib/table';
import BigNumber from 'bignumber.js';
import clsx from 'clsx';
import dayjs from 'dayjs';
import React, { useMemo } from 'react';
import { CommonTable } from '../CommonTable';

export const FundingHistory: React.FC = () => {
  const { userFunding } = useRabbySelector((store) => {
    return store.perps;
  });

  const columns = useMemo<ColumnType<UserFunding>[]>(
    () => [
      {
        title: 'Time',
        width: 160,
        sorter: (a, b) => dayjs(a.time).unix() - dayjs(b.time).unix(),
        render: (_, record) => {
          return (
            <div className="text-[13px] leading-[16px] font-semibold text-r-neutral-title-1">
              {dayjs(record.time).format('DD/MM/YYYY-HH:mm:ss')}
            </div>
          );
        },
      },

      {
        title: 'Market',
        width: 100,
        sorter: (a, b) => a.delta.coin.localeCompare(b.delta.coin),
        render: (_, record) => {
          return (
            <div className="text-[12px] leading-[14px] font-medium text-r-neutral-title-1">
              {record.delta.coin}
            </div>
          );
        },
      },

      {
        title: 'Size',
        width: 100,
        sorter: (a, b) => Number(a.delta.szi) - Number(b.delta.szi),
        render: (_, record) => {
          return (
            <div className="text-[12px] leading-[14px] font-medium text-r-neutral-title-1">
              {splitNumberByStep(record.delta.szi)} {record.delta.coin}
            </div>
          );
        },
      },
      {
        title: 'Side',
        width: 100,
        sorter: (a, b) =>
          (Number(a.delta.szi) >= 0 ? 1 : -1) -
          (Number(b.delta.szi) >= 0 ? 1 : -1),
        render: (_, record) => {
          return (
            <div className="text-[12px] leading-[14px] font-medium text-r-neutral-title-1">
              {Number(record.delta.szi) >= 0 ? 'Long' : 'Short'}
            </div>
          );
        },
      },
      {
        title: 'Payment',
        width: 100,
        sorter: (a, b) => Number(a.delta.usdc) - Number(b.delta.usdc),
        render: (_, record) => {
          return (
            <div
              className={clsx(
                'text-[12px] leading-[14px] font-medium',
                Number(record.delta.usdc) >= 0
                  ? 'text-rb-green-default'
                  : 'text-rb-red-default'
              )}
            >
              {Number(record.delta.usdc) >= 0 ? '+' : '-'}$
              {splitNumberByStep(
                new BigNumber(record.delta.usdc).abs().toFixed(4)
              )}
            </div>
          );
        },
      },
      {
        title: 'Rate',
        width: 100,
        sorter: (a, b) =>
          Number(a.delta.fundingRate) - Number(b.delta.fundingRate),
        render: (_, record) => {
          return (
            <div className="text-[12px] leading-[14px] font-medium text-r-neutral-title-1">
              {Number(record.delta.usdc) >= 0 ? '' : '-'}
              {new BigNumber(record.delta.fundingRate).times(100).toFixed(4)}%
            </div>
          );
        },
      },
    ],
    []
  );
  return (
    <CommonTable
      dataSource={userFunding}
      columns={columns}
      pagination={false}
      bordered={false}
      showSorterTooltip={false}
    ></CommonTable>
  );
};
