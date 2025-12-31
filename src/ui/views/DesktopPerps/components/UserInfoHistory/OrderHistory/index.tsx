import { PositionAndOpenOrder } from '@/ui/models/perps';
import { useRabbySelector } from '@/ui/store';
import { formatUsdValue, splitNumberByStep } from '@/ui/utils';
import { Table } from 'antd';
import { ColumnType } from 'antd/lib/table';
import clsx from 'clsx';
import React, { useMemo } from 'react';
import styled from 'styled-components';
import { CommonTable } from '../CommonTable';
import { UserHistoricalOrders, WsFill } from '@rabby-wallet/hyperliquid-sdk';
import dayjs from 'dayjs';
import BigNumber from 'bignumber.js';
import { sortBy } from 'lodash';
import { formatPercent } from '@/ui/views/Perps/utils';

export const OrderHistory: React.FC = () => {
  const historicalOrders = useRabbySelector((store) => {
    return store.perps.historicalOrders;
  });

  const list = useMemo<UserHistoricalOrders[]>(() => {
    return sortBy(historicalOrders, (item) => -item.statusTimestamp);
  }, [historicalOrders]);

  console.log('historicalOrders', list);

  const columns = useMemo<ColumnType<UserHistoricalOrders>[]>(
    () => [
      {
        title: 'Time',
        key: 'statusTimestamp',
        dataIndex: 'statusTimestamp',
        width: 180,
        sorter: (a, b) => a.statusTimestamp - b.statusTimestamp,
        render: (_, record) => {
          return (
            <div className="text-[13px] leading-[16px] font-semibold text-r-neutral-title-1">
              {dayjs(record.statusTimestamp).format('YYYY/MM/DD HH:mm:ss')}
            </div>
          );
        },
      },
      {
        title: 'Type',
        key: 'orderType',
        dataIndex: 'orderType',
        width: 180,
        sorter: (a, b) => a.order.orderType.localeCompare(b.order.orderType),
        render: (_, record) => {
          return (
            <div className="text-[12px] leading-[14px] font-medium text-r-neutral-title-1">
              {record.order.orderType}
            </div>
          );
        },
      },
      {
        title: 'Coin',
        key: 'coin',
        dataIndex: 'coin',
        width: 100,
        sorter: (a, b) => a.order.coin.localeCompare(b.order.coin),
        render: (_, record) => {
          return (
            <div className="text-[12px] leading-[14px] font-medium text-r-neutral-title-1">
              {record.order.coin}
            </div>
          );
        },
      },
      {
        title: 'Side',
        key: 'side',
        dataIndex: 'side',
        width: 120,
        sorter: (a, b) => a.order.side.localeCompare(b.order.side),
        render: (_, record) => {
          const isReduceOnly = record.order.reduceOnly;
          return (
            <div className="text-[12px] leading-[14px] font-medium text-r-neutral-title-1">
              {record.order.side === 'B'
                ? isReduceOnly
                  ? 'Close Short'
                  : 'Long'
                : isReduceOnly
                ? 'Close Long'
                : 'Short'}
            </div>
          );
        },
      },
      {
        title: 'Size',
        key: 'sz',
        dataIndex: 'sz',
        width: 120,
        sorter: (a, b) => Number(a.order.sz) - Number(b.order.sz),
        render: (_, record) => {
          return (
            <div className="text-[12px] leading-[14px] font-medium text-r-neutral-title-1">
              {Math.abs(Number(record.order.sz || 0))} {record.order.coin}
            </div>
          );
        },
      },

      {
        title: 'Filled',
        key: 'origSz',
        dataIndex: 'origSz',
        width: 120,
        // sorter: (a, b) => Number(a.order.origSz) - Number(b.order.origSz),
        render: (_, record) => {
          // todo
          return (
            <div className="text-[12px] leading-[14px] font-medium text-r-neutral-title-1">
              {Number(record.order.origSz) === 0 ? (
                '-'
              ) : (
                <>
                  {splitNumberByStep(
                    new BigNumber(record.order.origSz)
                      .minus(record.order.sz)
                      .toString()
                  )}{' '}
                  {record.order.coin}
                </>
              )}
            </div>
          );
        },
      },

      {
        title: 'Value',
        key: 'limitPx',
        dataIndex: 'limitPx',
        width: 120,
        // sorter: (a, b) =>
        //   new BigNumber(a.order.limitPx)
        //     .times(new BigNumber(a.order.sz).abs())
        //     .toNumber() -
        //   new BigNumber(b.order.limitPx)
        //     .times(new BigNumber(b.order.sz).abs())
        //     .toNumber(),
        render: (_, record) => {
          return (
            <div className="space-y-[4px]">
              <div className="text-[12px] leading-[14px] font-medium text-r-neutral-title-1">
                {record.order.orderType.includes('Market')
                  ? 'Market'
                  : `$${splitNumberByStep(
                      new BigNumber(record.order.limitPx)
                        .times(new BigNumber(record.order.sz).abs())
                        .toFixed(2)
                    )} USD`}
              </div>
            </div>
          );
        },
      },

      {
        title: 'Price',
        key: 'limitPx',
        dataIndex: 'limitPx',
        width: 120,
        // sorter: (a, b) => Number(a.order.limitPx) - Number(b.order.limitPx),
        render: (_, record) => {
          return (
            <div className="text-[12px] leading-[14px] font-medium text-r-neutral-title-1">
              {record.order.orderType.includes('Market')
                ? 'Market'
                : `$${splitNumberByStep(record.order.limitPx)}`}
            </div>
          );
        },
      },
      {
        title: 'Reduce Only',
        key: 'reduceOnly',
        dataIndex: 'reduceOnly',
        width: 100,
        render: (_, record) => {
          return (
            <div className="text-[12px] leading-[14px] font-medium text-r-neutral-title-1">
              {record.order.reduceOnly ? 'Yes' : 'No'}
            </div>
          );
        },
      },
      {
        title: 'Trigger',
        key: 'triggerCondition',
        dataIndex: 'triggerCondition',
        width: 180,
        render: (_, record) => {
          return (
            <div className="text-[12px] leading-[14px] font-medium text-r-neutral-title-1">
              {record.order.triggerCondition}
            </div>
          );
        },
      },
      {
        title: 'Status',
        key: 'status',
        dataIndex: 'status',
        width: 100,
        render: (_, record) => {
          // todo
          return (
            <div className="text-[12px] leading-[14px] font-medium text-r-neutral-title-1">
              {record.status}
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
      rowKey={(record) => `${record.order.oid}-${record.status}`}
    ></CommonTable>
  );
};
