import { useRabbySelector } from '@/ui/store';
import { splitNumberByStep } from '@/ui/utils';
import { UserFunding, WsUserFunding } from '@rabby-wallet/hyperliquid-sdk';
import { ColumnType } from 'antd/lib/table';
import BigNumber from 'bignumber.js';
import clsx from 'clsx';
import dayjs from 'dayjs';
import React, { useMemo } from 'react';
import { CommonTable } from '../CommonTable';
import { sortBy } from 'lodash';

export const FundingHistory: React.FC = () => {
  const { userFunding } = useRabbySelector((store) => {
    return store.perps;
  });

  const list = useMemo(() => {
    return sortBy(userFunding, (item) => -item.time);
  }, [userFunding]);

  const columns = useMemo<ColumnType<WsUserFunding['fundings'][number]>[]>(
    () => [
      {
        title: 'Time',
        dataIndex: 'time',
        key: 'time',
        width: 160,
        sorter: (a, b) => dayjs(a.time).unix() - dayjs(b.time).unix(),
        render: (_, record) => {
          return (
            <div className="text-[13px] leading-[16px] font-semibold text-r-neutral-title-1">
              {dayjs(record.time).format('YYYY/MM/DD HH:mm:ss')}
            </div>
          );
        },
      },

      {
        title: 'Market',
        dataIndex: 'coin',
        key: 'coin',
        width: 100,
        sorter: (a, b) => a.coin.localeCompare(b.coin),
        render: (_, record) => {
          return (
            <div className="text-[12px] leading-[14px] font-medium text-r-neutral-title-1">
              {record.coin}
            </div>
          );
        },
      },

      {
        title: 'Size',
        dataIndex: 'szi',
        key: 'szi',
        width: 100,
        sorter: (a, b) => Number(a.szi) - Number(b.szi),
        render: (_, record) => {
          return (
            <div className="text-[12px] leading-[14px] font-medium text-r-neutral-title-1">
              {splitNumberByStep(Math.abs(Number(record.szi)))} {record.coin}
            </div>
          );
        },
      },
      {
        title: 'Side',
        key: 'side',
        dataIndex: 'side',
        width: 100,
        sorter: (a, b) =>
          (Number(a.szi) >= 0 ? 1 : -1) - (Number(b.szi) >= 0 ? 1 : -1),
        render: (_, record) => {
          return (
            <div className="text-[12px] leading-[14px] font-medium text-r-neutral-title-1">
              {Number(record.szi) >= 0 ? 'Long' : 'Short'}
            </div>
          );
        },
      },
      {
        title: 'Payment',
        dataIndex: 'usdc',
        key: 'usdc',
        width: 100,
        sorter: (a, b) => Number(a.usdc) - Number(b.usdc),
        render: (_, record) => {
          return (
            <div
              className={clsx(
                'text-[12px] leading-[14px] font-medium',
                Number(record.usdc) >= 0
                  ? 'text-rb-green-default'
                  : 'text-rb-red-default'
              )}
            >
              {Number(record.usdc) >= 0 ? '+' : '-'}$
              {splitNumberByStep(new BigNumber(record.usdc).abs().toFixed(4))}
            </div>
          );
        },
      },
      {
        title: 'Rate',
        dataIndex: 'fundingRate',
        key: 'fundingRate',
        width: 100,
        sorter: (a, b) => Number(a.fundingRate) - Number(b.fundingRate),
        render: (_, record) => {
          return (
            <div className="text-[12px] leading-[14px] font-medium text-r-neutral-title-1">
              {Number(record.usdc) < 0 ? '' : '-'}
              {new BigNumber(record.fundingRate).times(100).toFixed(5)}%
            </div>
          );
        },
      },
    ],
    []
  );
  return (
    <CommonTable
      dataSource={list}
      columns={columns}
      pagination={false}
      bordered={false}
      showSorterTooltip={false}
    />
  );
};
