import { PositionAndOpenOrder } from '@/ui/models/perps';
import { useRabbySelector } from '@/ui/store';
import { formatUsdValue, splitNumberByStep } from '@/ui/utils';
import { Table } from 'antd';
import { ColumnType } from 'antd/lib/table';
import clsx from 'clsx';
import React, { useMemo } from 'react';
import styled from 'styled-components';
import { CommonTable } from '../CommonTable';

export const TradeHistory: React.FC = () => {
  const { positionAndOpenOrders, marketDataMap } = useRabbySelector(
    (store) => store.perps
  );

  console.log('positionAndOpenOrders', positionAndOpenOrders);

  const columns = useMemo<ColumnType<PositionAndOpenOrder>[]>(
    () => [
      {
        title: 'Coin',
        width: 160,
        className: 'relative',
        render: (_, record) => {
          return (
            <div
              className={clsx(
                'mx-[-16px] my-[-8px]',
                'px-[16px] py-[8px]',
                Number(record.position.szi) > 0 ? 'is-long-bg' : 'is-short-bg'
              )}
            >
              <div>
                <div className="text-[13px] leading-[16px] font-semibold text-rb-neutral-title1 mb-[2px]">
                  {record.position?.coin}
                </div>
                <div className="text-[12px] leading-[14px] font-medium text-rb-neutral-foot">
                  {record.position.leverage.value}x{' '}
                  {Number(record.position.szi) > 0 ? 'Long' : 'Short'}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        title: 'Size',
        width: 160,
        render: (_, record) => {
          return (
            <div>
              <div className="text-[12px] leading-[14px] font-medium text-rb-neutral-title-1 mb-[4px]">
                $
                {splitNumberByStep(
                  Number(record.position?.positionValue || 0).toFixed(2)
                )}
              </div>
              <div className="text-[12px] leading-[14px] font-medium text-rb-neutral-foot">
                {Math.abs(Number(record.position.szi || 0))}{' '}
                {record.position?.coin}
              </div>
            </div>
          );
        },
      },
      {
        title: 'Mark / Entry',
        width: 160,
        render: (_, record) => {
          const marketData = marketDataMap[record.position.coin || ''] || {};
          return (
            <div>
              <div className="text-[12px] leading-[14px] font-medium text-rb-neutral-title-1 mb-[4px]">
                $
                {splitNumberByStep(
                  Number(marketData.markPx).toFixed(marketData.pxDecimals || 0)
                )}
              </div>
              <div className="text-[12px] leading-[14px] font-medium text-rb-neutral-foot">
                $
                {splitNumberByStep(
                  Number(record.position.entryPx).toFixed(
                    marketData.pxDecimals || 0
                  )
                )}
              </div>
            </div>
          );
        },
      },
      {
        title: 'Unrealized PnL',
        width: 160,
        render: (_, record) => {
          const isUp = Number(record.position.unrealizedPnl) >= 0;
          return (
            <div>
              <div
                className={clsx(
                  'text-[12px] leading-[14px] font-medium  mb-[4px]',
                  isUp ? 'text-r-green-default' : 'text-r-red-default'
                )}
              >
                {isUp ? '+' : '-'}$
                {splitNumberByStep(
                  Math.abs(Number(record.position.unrealizedPnl)).toFixed(2)
                )}{' '}
              </div>
              <div
                className={clsx(
                  'text-[12px] leading-[14px] font-medium  mb-[4px]',
                  isUp ? 'text-r-green-default' : 'text-r-red-default'
                )}
              >
                {isUp ? '+' : '-'}
                {splitNumberByStep(
                  Math.abs(
                    Number(record.position.returnOnEquity) * 100
                  ).toFixed(2)
                )}
                %
              </div>
            </div>
          );
        },
      },
      {
        title: 'Liq.price',
        width: 160,
        render: (_, record) => {
          return (
            <div className="text-[12px] leading-[14px] font-medium text-rb-neutral-title-1">
              $
              {splitNumberByStep(
                Number(record.position.liquidationPx).toFixed(2)
              )}
            </div>
          );
        },
      },
      {
        title: 'Margin',
        width: 160,
        render: (_, record) => {
          return (
            <div className="text-[12px] leading-[14px] font-medium text-rb-neutral-title-1">
              {formatUsdValue(Number(record.position.marginUsed || 0))}
            </div>
          );
        },
      },
      {
        title: 'Funding',
        render: (_, record) => {
          return (
            <div className="text-[12px] leading-[14px] font-medium text-rb-neutral-foot">
              {Number(record.position.cumFunding.sinceOpen || 0) === 0
                ? ''
                : Number(record.position.cumFunding.sinceOpen || 0) > 0
                ? '+'
                : '-'}
              ${Math.abs(Number(record.position.cumFunding.sinceOpen || 0))}
            </div>
          );
        },
      },
      {
        title: 'TP/SL',
        width: 160,
      },
      {
        title: 'Close All',
        width: 160,
      },
    ],
    [marketDataMap]
  );
  return (
    <CommonTable
      dataSource={positionAndOpenOrders}
      columns={columns}
      pagination={false}
      bordered={false}
    ></CommonTable>
  );
};
