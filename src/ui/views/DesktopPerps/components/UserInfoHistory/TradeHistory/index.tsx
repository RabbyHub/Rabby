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
import { formatPercent } from '@/ui/views/Perps/utils';

export const TradeHistory: React.FC = () => {
  const { userFills } = useRabbySelector((store) => {
    return store.perps;
  });

  const list = useMemo<WsFill[]>(() => {
    return sortBy(userFills, (item) => -item.time);
  }, [userFills]);

  const columns = useMemo<ColumnType<WsFill>[]>(
    () => [
      {
        title: 'Time',
        width: 180,
        sorter: (a, b) => a.time - b.time,
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
        width: 80,
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
        width: 100,
        sorter: (a, b) => Number(a.sz) - Number(b.sz),
        render: (_, record) => {
          return (
            <div className="text-[12px] leading-[14px] font-medium text-r-neutral-title-1">
              {Math.abs(Number(record.sz || 0))} {record.coin}
            </div>
          );
        },
      },
      {
        title: 'Trade',
        width: 100,
        sorter: (a, b) => a.dir.localeCompare(b.dir),
        render: (_, record) => {
          return (
            <div className="text-[12px] leading-[14px] font-medium text-r-neutral-title-1">
              {record.dir}
            </div>
          );
        },
      },
      {
        title: 'Avg Price',
        width: 180,
        sorter: (a, b) => Number(a.px) - Number(b.px),
        render: (_, record) => {
          return (
            <div className="text-[12px] leading-[14px] font-medium text-r-neutral-title-1">
              ${splitNumberByStep(record.px)}
            </div>
          );
        },
      },
      {
        title: 'Trade Value',
        width: 180,
        sorter: (a, b) =>
          new BigNumber(a.px).times(new BigNumber(a.sz).abs()).toNumber() -
          new BigNumber(b.px).times(new BigNumber(b.sz).abs()).toNumber(),
        render: (_, record) => {
          return (
            <div className="space-y-[4px]">
              <div className="text-[12px] leading-[14px] font-medium text-r-neutral-title-1">
                {splitNumberByStep(
                  new BigNumber(record.px)
                    .times(new BigNumber(record.sz).abs())
                    .toFixed(2)
                )}{' '}
                USDC
              </div>
              <div className="text-[12px] leading-[14px] font-medium text-r-neutral-title-1">
                {Math.abs(Number(record.sz || 0))} {record.coin}
              </div>
            </div>
          );
        },
      },
      {
        title: 'Closed Pnl',
        width: 180,
        sorter: (a, b) => Number(a.closedPnl) - Number(b.closedPnl),
        render: (_, record) => {
          return (
            <div
              className={clsx(
                'space-y-[4px]',
                'text-[12px] leading-[14px] font-medium',
                Number(record.closedPnl) === 0
                  ? 'text-rb-neutral-foot'
                  : Number(record.closedPnl) > 0
                  ? 'text-rb-green-default'
                  : 'text-rb-red-default'
              )}
            >
              {Number(record.closedPnl) === 0 ? (
                <>
                  <div>-</div>
                  <div>-</div>
                </>
              ) : (
                <>
                  <div>
                    {Number(record.closedPnl) > 0 ? '+' : '-'}$
                    {splitNumberByStep(Math.abs(Number(record.closedPnl)))}
                  </div>
                  <div>
                    {Number(record.closedPnl) > 0 ? '+' : '-'}$
                    {formatPercent(
                      new BigNumber(record.closedPnl)
                        .div(record.sz)
                        .div(record.px)
                        .abs()
                        .toNumber(),
                      2
                    )}
                  </div>
                </>
              )}
            </div>
          );
        },
      },
      {
        title: 'Fee',
        width: 180,
        sorter: (a, b) => Number(a.fee) - Number(b.fee),
        render: (_, record) => {
          return (
            <div className="text-[12px] leading-[14px] font-medium text-r-neutral-title-1">
              ${splitNumberByStep(record.fee)}
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
    ></CommonTable>
  );
};
