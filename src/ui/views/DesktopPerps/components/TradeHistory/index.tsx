import { PositionAndOpenOrder } from '@/ui/models/perps';
import { useRabbySelector } from '@/ui/store';
import { formatUsdValue, splitNumberByStep } from '@/ui/utils';
import { Table } from 'antd';
import { ColumnType } from 'antd/lib/table';
import clsx from 'clsx';
import React, { useMemo } from 'react';
import styled from 'styled-components';
import { CommonTable } from '../CommonTable';
import { WsFill } from '@rabby-wallet/hyperliquid-sdk';
import dayjs from 'dayjs';
import BigNumber from 'bignumber.js';
import { sortBy } from 'lodash';

export const TradeHistory: React.FC = () => {
  const { userFills } = useRabbySelector((store) => {
    return store.perps;
  });

  console.log('userFills', userFills);
  const list = useMemo<WsFill[]>(() => {
    return sortBy(userFills, (item) => -item.time);
  }, [userFills]);

  const columns = useMemo<ColumnType<WsFill>[]>(
    () => [
      {
        title: 'Time',
        width: 180,
        render: (_, record) => {
          return (
            <div className="text-[13px] leading-[16px] font-semibold text-rb-neutral-title1">
              {dayjs(record.time).format('YYYY/MM/DD-HH:mm:ss')}
            </div>
          );
        },
      },
      {
        title: 'Market',
        width: 180,
        render: (_, record) => {
          return (
            <div className="text-[12px] leading-[14px] font-medium text-rb-neutral-title-1">
              {record.coin}
            </div>
          );
        },
      },
      {
        title: 'Size',
        width: 180,
        render: (_, record) => {
          return (
            <div className="text-[12px] leading-[14px] font-medium text-rb-neutral-title-1">
              {Math.abs(Number(record.sz || 0))} {record.coin}
            </div>
          );
        },
      },
      {
        title: 'Trade',
        width: 180,
        render: (_, record) => {
          return (
            <div className="text-[12px] leading-[14px] font-medium text-rb-neutral-title-1">
              {record.dir}
            </div>
          );
        },
      },
      {
        title: 'Avg Price',
        width: 180,
        render: (_, record) => {
          return (
            <div className="text-[12px] leading-[14px] font-medium text-rb-neutral-title-1">
              {record.px}
            </div>
          );
        },
      },
      {
        title: 'Trade Value',
        width: 180,
        render: (_, record) => {
          return (
            <div className="text-[12px] leading-[14px] font-medium text-rb-neutral-title-1">
              {new BigNumber(record.px)
                .times(new BigNumber(record.sz).abs())
                .toFixed(2)}
            </div>
          );
        },
      },
      {
        title: 'Closed Pnl',
        width: 180,
        render: (_, record) => {
          return (
            <div className="text-[12px] leading-[14px] font-medium text-rb-neutral-title-1">
              {record.closedPnl}
            </div>
          );
        },
      },
      {
        title: 'Fee',
        width: 180,
        render: (_, record) => {
          return (
            <div className="text-[12px] leading-[14px] font-medium text-rb-neutral-title-1">
              {record.fee}
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
    ></CommonTable>
  );
};
