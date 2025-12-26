import { MarketData, PositionAndOpenOrder } from '@/ui/models/perps';
import { useRabbySelector } from '@/ui/store';
import { formatUsdValue, splitNumberByStep } from '@/ui/utils';
import { Button, Table, Tooltip } from 'antd';
import { ColumnType } from 'antd/lib/table';
import clsx from 'clsx';
import React, { useMemo, useState } from 'react';
import styled from 'styled-components';
import { CommonTable } from '../CommonTable';
import BigNumber from 'bignumber.js';
import { ReactComponent as RcIconAlarmCC } from '@/ui/assets/perps/icon-alarm-cc.svg';
import {
  calculateDistanceToLiquidation,
  formatPerpsPct,
} from '@/ui/views/Perps/utils';
import { RcIconEditCC } from '@/ui/assets/desktop/common';
import { OpenOrder } from '@rabby-wallet/hyperliquid-sdk';
import dayjs from 'dayjs';

export const OpenOrders: React.FC = () => {
  const {
    positionAndOpenOrders,
    marketDataMap,
    accountSummary,
  } = useRabbySelector((store) => store.perps);

  const orders = useMemo(() => {
    return positionAndOpenOrders.flatMap((item) => item.openOrders || []);
  }, [positionAndOpenOrders]);

  console.log('orders', orders);

  const [editMarginVisible, setEditMarginVisible] = useState(false);
  const [editTpSlVisible, setEditTpSlVisible] = useState(false);
  const [currentAssetCtx, setCurrentAssetCtx] = useState<MarketData | null>(
    null
  );
  const [
    currentPosition,
    setCurrentPosition,
  ] = useState<PositionAndOpenOrder | null>(null);

  // Position data if exists
  const positionData = useMemo(
    () =>
      currentPosition
        ? {
            pnl: Number(currentPosition.position.unrealizedPnl || 0),
            positionValue: Number(currentPosition.position.positionValue || 0),
            size: Math.abs(Number(currentPosition.position.szi || 0)),
            marginUsed: Number(currentPosition.position.marginUsed || 0),
            side:
              Number(currentPosition.position.szi || 0) > 0 ? 'Long' : 'Short',
            type: currentPosition.position.leverage.type,
            leverage: Number(currentPosition.position.leverage.value || 1),
            entryPrice: Number(currentPosition.position.entryPx || 0),
            liquidationPrice: Number(
              currentPosition.position.liquidationPx || 0
            ).toFixed(currentAssetCtx?.pxDecimals || 2),
            autoClose: false, // This would come from SDK
            direction:
              Number(currentPosition.position.szi || 0) > 0 ? 'Long' : 'Short',
            pnlPercent:
              Number(currentPosition.position.returnOnEquity || 0) * 100,
            fundingPayments: currentPosition.position.cumFunding.sinceOpen,
          }
        : null,
    [currentPosition, currentAssetCtx]
  );

  const columns = useMemo<ColumnType<OpenOrder>[]>(
    () => [
      {
        title: 'Order',
        width: 180,
        className: 'relative',
        render: (_, record) => {
          const isTpSL =
            record.orderType.includes('Take Profit') ||
            record.orderType.includes('Stop');
          return (
            <div
              className={clsx(
                'absolute top-0 left-0 right-0 bottom-0',
                'flex flex-col justify-center',
                'px-[16px] py-[8px]',
                record.side === 'B' ? 'is-long-bg' : 'is-short-bg'
              )}
            >
              <div className="text-[13px] leading-[16px] font-semibold text-rb-neutral-title1 mb-[2px]">
                {record.coin}{' '}
                {record.side === 'B'
                  ? isTpSL
                    ? 'Close Short'
                    : 'Long'
                  : isTpSL
                  ? 'Close Long'
                  : 'Short'}
              </div>
            </div>
          );
        },
      },
      {
        title: 'Time',
        width: 160,
        render: (_, record) => {
          return (
            <div className="text-[12px] leading-[14px] font-medium text-rb-neutral-foot">
              {dayjs(record.timestamp).format('YYYY/MM/DD-HH:mm:ss')}
            </div>
          );
        },
      },
      {
        title: 'Type',
        width: 130,
        render: (_, record) => {
          return (
            <div className="text-[12px] leading-[14px] font-medium text-rb-neutral-foot">
              {record.orderType}
            </div>
          );
        },
      },
      {
        title: 'Order Value / Size',
        width: 180,
        render: (_, record) => {
          return Number(record.origSz) === 0 ? (
            <div className="space-y-[4px]">
              <div className="text-[12px] leading-[14px] font-medium text-rb-neutral-title-1">
                -
              </div>
              <div className="text-[12px] leading-[14px] font-medium text-rb-neutral-foot">
                -
              </div>
            </div>
          ) : (
            <div className="space-y-[4px]">
              <div className="text-[12px] leading-[14px] font-medium text-rb-neutral-title-1">
                $
                {splitNumberByStep(
                  new BigNumber(record.origSz).times(record.limitPx).toFixed(2)
                )}
              </div>
              <div className="text-[12px] leading-[14px] font-medium text-rb-neutral-foot">
                {record.origSz} {record.coin}
              </div>
            </div>
          );
        },
      },
      {
        title: 'Filled',
        width: 120,
        render: (_, record) => {
          // todo
          return (
            <div className="text-[12px] leading-[14px] font-medium text-rb-neutral-title-1">
              {Number(record.origSz) === 0 ? (
                '-'
              ) : (
                <>
                  {splitNumberByStep(
                    new BigNumber(record.origSz).minus(record.sz).toString()
                  )}{' '}
                  / {record.origSz} {record.coin}
                </>
              )}
            </div>
          );
        },
      },
      {
        title: 'Price',
        width: 120,
        render: (_, record) => {
          return (
            <div className="text-[12px] leading-[14px] font-medium text-rb-neutral-title-1">
              {record.orderType.includes('Market')
                ? 'Market'
                : `$${splitNumberByStep(record.limitPx)}`}
            </div>
          );
        },
      },
      {
        title: 'Reduce Only',
        width: 100,
        render: (_, record) => {
          return (
            <div className="text-[12px] leading-[14px] font-medium text-rb-neutral-title-1">
              {record.reduceOnly ? 'Yes' : 'No'}
            </div>
          );
        },
      },
      {
        title: 'Trigger Conditions',
        width: 180,
        render: (_, record) => {
          return (
            <div className="text-[12px] leading-[14px] font-medium text-rb-neutral-foot">
              {record.triggerCondition}
            </div>
          );
        },
      },
      {
        title: 'TP/SL',
        width: 180,
        render: (_, record) => {
          // todo
          const tpItem = ((record as any).children as OpenOrder[])?.find(
            (order) =>
              order.orderType === 'Take Profit Market' &&
              order.isTrigger &&
              order.reduceOnly
          );

          const slItem = ((record as any).children as OpenOrder[])?.find(
            (order) =>
              order.orderType === 'Stop Market' &&
              order.isTrigger &&
              order.reduceOnly
          );
          return (
            <div className="space-y-[4px]">
              <div className="text-[12px] leading-[14px] font-medium text-rb-neutral-title-1">
                {tpItem?.triggerPx
                  ? `$${splitNumberByStep(tpItem.triggerPx)}`
                  : '-'}
              </div>

              <div className="text-[12px] leading-[14px] font-medium text-rb-neutral-title-1">
                {slItem?.triggerPx
                  ? `$${splitNumberByStep(slItem.triggerPx)}`
                  : '-'}
              </div>
            </div>
          );
        },
      },
      {
        title: (
          <div className="text-r-blue-default cursor-pointer underline">
            Cancel All
          </div>
        ),
        align: 'center',
        width: 120,
        render: (_, record) => {
          return <Button>Cancel</Button>;
        },
      },
    ],
    [marketDataMap]
  );
  return (
    <>
      <CommonTable
        dataSource={orders}
        columns={columns}
        pagination={false}
        bordered={false}
        expandable={{
          childrenColumnName: '__not_exist__',
        }}
      ></CommonTable>
    </>
  );
};
