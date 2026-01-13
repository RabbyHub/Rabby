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
import { useTranslation } from 'react-i18next';

export const TradeHistory: React.FC = () => {
  const { userFills } = useRabbySelector((store) => {
    return store.perps;
  });

  const marketDataMap = useRabbySelector((store) => {
    return store.perps.marketDataMap;
  });

  const { t } = useTranslation();

  const list = useMemo<WsFill[]>(() => {
    return sortBy(userFills, (item) => -item.time);
  }, [userFills]);

  const columns = useMemo<ColumnType<WsFill>[]>(
    () => [
      {
        title: t('page.perpsPro.userInfo.tab.time'),
        key: 'time',
        dataIndex: 'time',
        width: 180,
        sorter: (a, b) => a.time - b.time,
        render: (_, record) => {
          return (
            <div className="text-[13px] leading-[16px] font-510 text-r-neutral-title-1">
              {dayjs(record.time).format('YYYY/MM/DD HH:mm:ss')}
            </div>
          );
        },
      },
      {
        title: t('page.perpsPro.userInfo.tab.coin'),
        key: 'coin',
        dataIndex: 'coin',
        width: 80,
        sorter: (a, b) => a.coin.localeCompare(b.coin),
        render: (_, record) => {
          return (
            <div className="text-[12px] leading-[14px] font-510 text-r-neutral-title-1">
              {record.coin}
            </div>
          );
        },
      },
      {
        title: t('page.perpsPro.userInfo.tab.size'),
        key: 'sz',
        dataIndex: 'sz',
        width: 100,
        sorter: (a, b) => Number(a.sz) - Number(b.sz),
        render: (_, record) => {
          return (
            <div className="text-[12px] leading-[14px] font-510 text-r-neutral-title-1">
              {Math.abs(Number(record.sz || 0))} {record.coin}
            </div>
          );
        },
      },
      {
        title: t('page.perpsPro.userInfo.tab.trade'),
        key: 'dir',
        dataIndex: 'dir',
        width: 100,
        sorter: (a, b) => a.dir.localeCompare(b.dir),
        render: (_, record) => {
          return (
            <div className="text-[12px] leading-[14px] font-510 text-r-neutral-title-1">
              {record.dir}
            </div>
          );
        },
      },
      {
        title: t('page.perpsPro.userInfo.tab.averagePrice'),
        key: 'px',
        dataIndex: 'px',
        width: 180,
        sorter: (a, b) => Number(a.px) - Number(b.px),
        render: (_, record) => {
          const pxDecimals =
            marketDataMap[record.coin.toUpperCase()]?.pxDecimals || 2;
          const px = new BigNumber(record.px).toFixed(pxDecimals);
          return (
            <div className="text-[12px] leading-[14px] font-510 text-r-neutral-title-1">
              ${splitNumberByStep(px)}
            </div>
          );
        },
      },
      {
        title: t('page.perpsPro.userInfo.tab.tradeValue'),
        key: 'tradeValue',
        dataIndex: 'tradeValue',
        width: 180,
        sorter: (a, b) =>
          new BigNumber(a.px).times(new BigNumber(a.sz).abs()).toNumber() -
          new BigNumber(b.px).times(new BigNumber(b.sz).abs()).toNumber(),
        render: (_, record) => {
          return (
            <div className="space-y-[4px]">
              <div className="text-[12px] leading-[14px] font-510 text-r-neutral-title-1">
                {splitNumberByStep(
                  new BigNumber(record.px)
                    .times(new BigNumber(record.sz).abs())
                    .toFixed(2)
                )}{' '}
                USDC
              </div>
              <div className="text-[12px] leading-[14px] font-510 text-r-neutral-title-1">
                {Math.abs(Number(record.sz || 0))} {record.coin}
              </div>
            </div>
          );
        },
      },
      {
        title: t('page.perpsPro.userInfo.tab.closedPnl'),
        key: 'closedPnl',
        dataIndex: 'closedPnl',
        width: 180,
        sorter: (a, b) => Number(a.closedPnl) - Number(b.closedPnl),
        render: (_, record) => {
          return (
            <div
              className={clsx(
                'space-y-[4px]',
                'text-[12px] leading-[14px] font-510',
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
                    {splitNumberByStep(
                      Math.abs(Number(record.closedPnl)).toFixed(2)
                    )}
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
        title: t('page.perpsPro.userInfo.tab.fee'),
        key: 'fee',
        dataIndex: 'fee',
        width: 180,
        sorter: (a, b) => Number(a.fee) - Number(b.fee),
        render: (_, record) => {
          return (
            <div className="text-[12px] leading-[14px] font-510 text-r-neutral-title-1">
              ${splitNumberByStep(record.fee)}
            </div>
          );
        },
      },
    ],
    [marketDataMap]
  );
  return (
    <CommonTable
      dataSource={list}
      columns={columns}
      pagination={false}
      bordered={false}
      showSorterTooltip={false}
      rowKey="hash"
      defaultSortField="time"
      defaultSortOrder="descend"
    ></CommonTable>
  );
};
