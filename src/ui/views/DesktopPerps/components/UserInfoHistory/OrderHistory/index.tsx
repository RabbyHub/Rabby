import { PositionAndOpenOrder } from '@/ui/models/perps';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { formatUsdValue, splitNumberByStep } from '@/ui/utils';
import { Table } from 'antd';
import { ColumnType } from 'antd/lib/table';
import clsx from 'clsx';
import React, { useCallback, useMemo, useEffect, useState } from 'react';
import styled from 'styled-components';
import { CommonTable } from '../CommonTable';
import { UserHistoricalOrders, WsFill } from '@rabby-wallet/hyperliquid-sdk';
import dayjs from 'dayjs';
import BigNumber from 'bignumber.js';
import { sortBy } from 'lodash';
import { formatPercent } from '@/ui/views/Perps/utils';
import { useTranslation } from 'react-i18next';
import { getPerpsSDK } from '@/ui/views/Perps/sdkManager';
import { DashedUnderlineText } from '../../DashedUnderlineText';
import {
  formatPerpsCoin,
  formatPerpsOrderStatus,
} from '@/ui/views/DesktopPerps/utils';

export const OrderHistory: React.FC = () => {
  const dispatch = useRabbyDispatch();
  const historicalOrders = useRabbySelector((store) => {
    return store.perps.historicalOrders;
  });

  const { t } = useTranslation();

  const list = useMemo<UserHistoricalOrders[]>(() => {
    return sortBy(historicalOrders, (item) => -item.statusTimestamp);
  }, [historicalOrders]);

  const fetchHistoricalOrders = useCallback(() => {
    const sdk = getPerpsSDK();
    sdk.info.getUserHistoricalOrders().then((res) => {
      dispatch.perps.patchState({ historicalOrders: res.slice(0, 2000) });
    });
  }, []);

  useEffect(() => {
    fetchHistoricalOrders();
  }, []);

  const columns = useMemo<ColumnType<UserHistoricalOrders>[]>(
    () => [
      {
        title: t('page.perpsPro.userInfo.tab.time'),
        key: 'statusTimestamp',
        dataIndex: 'statusTimestamp',
        width: 160,
        // need filled front by open status
        sorter: (a, b) =>
          a.statusTimestamp - b.statusTimestamp ||
          b.status.localeCompare(a.status),
        render: (_, record) => {
          return (
            <div className="text-[13px] leading-[16px]  text-r-neutral-title-1">
              {dayjs(record.statusTimestamp).format('YYYY/MM/DD HH:mm:ss')}
            </div>
          );
        },
      },
      {
        title: t('page.perpsPro.userInfo.tab.type'),
        key: 'orderType',
        dataIndex: 'orderType',
        // width: 180,
        sorter: (a, b) => a.order.orderType.localeCompare(b.order.orderType),
        render: (_, record) => {
          return (
            <div className="text-[12px] leading-[14px]  text-r-neutral-title-1">
              {record.order.orderType}
            </div>
          );
        },
      },
      {
        title: t('page.perpsPro.userInfo.tab.coin'),
        key: 'coin',
        dataIndex: 'coin',
        // width: 100,
        sorter: (a, b) => a.order.coin.localeCompare(b.order.coin),
        render: (_, record) => {
          return (
            <div
              className={`text-[12px] leading-[14px]  text-r-neutral-title-1 cursor-pointer hover:font-bold hover:text-rb-brand-default ${
                record.order.side === 'B'
                  ? 'text-rb-green-default'
                  : 'text-rb-red-default'
              }`}
              onClick={() => {
                dispatch.perps.setSelectedCoin(record.order.coin);
              }}
            >
              {formatPerpsCoin(record.order.coin)}
            </div>
          );
        },
      },
      {
        title: t('page.perpsPro.userInfo.tab.side'),
        key: 'side',
        dataIndex: 'side',
        // width: 120,
        sorter: (a, b) => a.order.side.localeCompare(b.order.side),
        render: (_, record) => {
          const isReduceOnly = record.order.reduceOnly;
          return (
            <div
              className={`text-[12px] leading-[14px] ${
                record.order.side === 'B'
                  ? 'text-rb-green-default'
                  : 'text-rb-red-default'
              }`}
            >
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
        title: t('page.perpsPro.userInfo.tab.size'),
        key: 'sz',
        dataIndex: 'sz',
        // width: 120,
        // sorter: (a, b) => Number(a.order.sz) - Number(b.order.sz),
        render: (_, record) => {
          return (
            <div className="text-[12px] leading-[14px]  text-r-neutral-title-1">
              {Number(record.order.origSz) === 0 ? (
                '-'
              ) : (
                <>{splitNumberByStep(record.order.origSz)}</>
              )}
            </div>
          );
        },
      },

      {
        title: t('page.perpsPro.userInfo.tab.filled'),
        key: 'origSz',
        dataIndex: 'origSz',
        // width: 120,
        // sorter: (a, b) => Number(a.order.sz) || Number(a.order.or) - Number(b.order.sz) || 0,
        render: (_, record) => {
          const isReduceOnly = record.order.reduceOnly;
          const fillSz = Number(record.order.sz)
            ? Number(record.order.sz)
            : Number(record.order.origSz);

          return (
            <div className="text-[12px] leading-[14px]  text-r-neutral-title-1">
              {record.status !== 'filled' ? (
                '-'
              ) : (
                <>{splitNumberByStep(new BigNumber(fillSz).toString())}</>
              )}
            </div>
          );
        },
      },

      {
        title: t('page.perpsPro.userInfo.tab.value'),
        key: 'limitPx',
        dataIndex: 'limitPx',
        // width: 120,
        // sorter: (a, b) =>
        //   new BigNumber(a.order.limitPx)
        //     .times(new BigNumber(a.order.sz).abs())
        //     .toNumber() -
        //   new BigNumber(b.order.limitPx)
        //     .times(new BigNumber(b.order.sz).abs())
        //     .toNumber(),
        render: (_, record) => {
          const fillSz = Number(record.order.sz)
            ? record.order.sz
            : record.order.origSz;
          return (
            <div className="space-y-[4px]">
              <div className="text-[12px] leading-[14px]  text-r-neutral-title-1">
                {record.order.orderType.includes('Market')
                  ? '-'
                  : `$${splitNumberByStep(
                      new BigNumber(record.order.limitPx)
                        .times(new BigNumber(fillSz).abs())
                        .toFixed(2)
                    )}`}
              </div>
            </div>
          );
        },
      },

      {
        title: t('page.perpsPro.userInfo.tab.price'),
        key: 'limitPx',
        dataIndex: 'limitPx',
        // width: 120,
        // sorter: (a, b) => Number(a.order.limitPx) - Number(b.order.limitPx),
        render: (_, record) => {
          return (
            <div className="text-[12px] leading-[14px]  text-r-neutral-title-1">
              {record.order.orderType.includes('Market')
                ? 'Market'
                : `$${splitNumberByStep(record.order.limitPx)}`}
            </div>
          );
        },
      },
      {
        title: (
          <DashedUnderlineText
            tooltipText={t('page.perpsPro.userInfo.openOrders.reduceOnly')}
          >
            {t('page.perpsPro.userInfo.openOrders.ro')}
          </DashedUnderlineText>
        ),
        key: 'reduceOnly',
        dataIndex: 'reduceOnly',
        width: 60,
        render: (_, record) => {
          return (
            <div className="text-[12px] leading-[14px]  text-r-neutral-title-1">
              {record.order.reduceOnly ? 'Yes' : 'No'}
            </div>
          );
        },
      },
      {
        title: t('page.perpsPro.userInfo.tab.trigger'),
        key: 'triggerCondition',
        dataIndex: 'triggerCondition',
        // width: 180,
        render: (_, record) => {
          return (
            <div className="text-[12px] leading-[14px]  text-r-neutral-title-1">
              {record.order.triggerCondition}
            </div>
          );
        },
      },
      {
        title: t('page.perpsPro.userInfo.tab.status'),
        key: 'status',
        dataIndex: 'status',
        // width: 100,
        render: (_, record) => {
          const { statusStr, tipsStr } = formatPerpsOrderStatus(record);
          return tipsStr ? (
            <DashedUnderlineText
              className="text-[12px] leading-[14px]  text-r-neutral-title-1"
              tooltipText={tipsStr}
            >
              {statusStr}
            </DashedUnderlineText>
          ) : (
            <div className="text-[12px] leading-[14px]  text-r-neutral-title-1">
              {statusStr}
            </div>
          );
        },
      },
    ],
    []
  );
  return (
    <CommonTable
      emptyMessage={t('page.perpsPro.userInfo.emptyMessage.openOrders')}
      dataSource={list}
      columns={columns}
      pagination={false}
      bordered={false}
      showSorterTooltip={false}
      rowKey={(record) => `${record.order.oid}-${record.status}`}
      defaultSortField="statusTimestamp"
      defaultSortOrder="descend"
      virtual
      rowHeight={32}
    />
  );
};
