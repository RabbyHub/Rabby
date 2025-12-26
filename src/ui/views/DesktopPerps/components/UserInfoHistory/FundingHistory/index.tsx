import { PositionAndOpenOrder } from '@/ui/models/perps';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { formatUsdValue, splitNumberByStep } from '@/ui/utils';
import { Table } from 'antd';
import { ColumnType } from 'antd/lib/table';
import clsx from 'clsx';
import React, { useMemo } from 'react';
import styled from 'styled-components';
import { CommonTable } from '../CommonTable';
import {
  UserFunding,
  UserHistoricalOrders,
  WsFill,
} from '@rabby-wallet/hyperliquid-sdk';
import dayjs from 'dayjs';
import BigNumber from 'bignumber.js';
import { sortBy } from 'lodash';
import { formatPercent } from '@/ui/views/Perps/utils';
import { useMount } from 'react-use';

export const FundingHistory: React.FC = () => {
  const { userFills, historicalOrders, userFunding } = useRabbySelector(
    (store) => {
      return store.perps;
    }
  );

  console.log('userFunding', userFunding);

  const dispatch = useRabbyDispatch();

  useMount(() => {
    dispatch.perps.fetchUserFunding(undefined);
  });

  console.log('historicalOrders', historicalOrders);

  const columns = useMemo<ColumnType<UserFunding>[]>(
    () => [
      {
        title: 'Time',
        width: 180,
        render: (_, record) => {
          return (
            <div className="text-[13px] leading-[16px] font-semibold text-rb-neutral-title1">
              {dayjs(record.time).format('DD/MM/YYYY-HH:mm:ss')}
            </div>
          );
        },
      },

      {
        title: 'Market',
        width: 100,
        render: (_, record) => {
          return (
            <div className="text-[12px] leading-[14px] font-medium text-rb-neutral-title-1">
              {record.coin}
            </div>
          );
        },
      },
      // {
      //   title: 'Side',
      //   width: 180,
      //   render: (_, record) => {
      //     const isTpSL =
      //       record.order.orderType.includes('Take Profit') ||
      //       record.order.orderType.includes('Stop');
      //     return (
      //       <div className="text-[12px] leading-[14px] font-medium text-rb-neutral-title-1">
      //         {record.order.side === 'B'
      //           ? isTpSL
      //             ? 'Close Short'
      //             : 'Long'
      //           : isTpSL
      //           ? 'Close Long'
      //           : 'Short'}
      //       </div>
      //     );
      //   },
      // },
      // {
      //   title: 'Size',
      //   width: 180,
      //   render: (_, record) => {
      //     return (
      //       <div className="text-[12px] leading-[14px] font-medium text-rb-neutral-title-1">
      //         {Math.abs(Number(record.order.sz || 0))} {record.order.coin}
      //       </div>
      //     );
      //   },
      // },

      // {
      //   title: 'Filled',
      //   width: 120,
      //   render: (_, record) => {
      //     // todo
      //     return (
      //       <div className="text-[12px] leading-[14px] font-medium text-rb-neutral-title-1">
      //         {Number(record.order.origSz) === 0 ? (
      //           '-'
      //         ) : (
      //           <>
      //             {splitNumberByStep(
      //               new BigNumber(record.order.origSz)
      //                 .minus(record.order.sz)
      //                 .toString()
      //             )}{' '}
      //             {record.order.coin}
      //           </>
      //         )}
      //       </div>
      //     );
      //   },
      // },

      // {
      //   title: 'Value',
      //   width: 180,
      //   render: (_, record) => {
      //     return (
      //       <div className="space-y-[4px]">
      //         <div className="text-[12px] leading-[14px] font-medium text-rb-neutral-title-1">
      //           $
      //           {splitNumberByStep(
      //             new BigNumber(record.order.triggerPx)
      //               .times(new BigNumber(record.order.sz).abs())
      //               .toFixed(2)
      //           )}{' '}
      //         </div>
      //       </div>
      //     );
      //   },
      // },

      // {
      //   title: 'Price',
      //   width: 120,
      //   render: (_, record) => {
      //     return (
      //       <div className="text-[12px] leading-[14px] font-medium text-rb-neutral-title-1">
      //         {record.order.orderType.includes('Market')
      //           ? 'Market'
      //           : `$${splitNumberByStep(record.order.limitPx)}`}
      //       </div>
      //     );
      //   },
      // },
      // {
      //   title: 'Reduce Only',
      //   width: 100,
      //   render: (_, record) => {
      //     return (
      //       <div className="text-[12px] leading-[14px] font-medium text-rb-neutral-title-1">
      //         {record.order.reduceOnly ? 'Yes' : 'No'}
      //       </div>
      //     );
      //   },
      // },
      // {
      //   title: 'Trigger',
      //   width: 180,
      //   render: (_, record) => {
      //     return (
      //       <div className="text-[12px] leading-[14px] font-medium text-rb-neutral-title-1">
      //         {record.order.triggerCondition}
      //       </div>
      //     );
      //   },
      // },
      // {
      //   title: 'Status',
      //   width: 180,
      //   render: (_, record) => {
      //     // todo
      //     return (
      //       <div className="text-[12px] leading-[14px] font-medium text-rb-neutral-title-1">
      //         {record.status}
      //       </div>
      //     );
      //   },
      // },
    ],
    []
  );
  return (
    <CommonTable
      dataSource={userFunding}
      columns={columns}
      pagination={false}
      bordered={false}
    ></CommonTable>
  );
};
