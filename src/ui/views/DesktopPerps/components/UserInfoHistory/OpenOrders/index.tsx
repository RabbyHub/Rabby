import { MarketData } from '@/ui/models/perps';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { splitNumberByStep } from '@/ui/utils';
import { getPerpsSDK } from '@/ui/views/Perps/sdkManager';
import { CancelOrderParams, OpenOrder } from '@rabby-wallet/hyperliquid-sdk';
import { useMemoizedFn } from 'ahooks';
import { Button, message, Modal } from 'antd';
import { ColumnType } from 'antd/lib/table';
import BigNumber from 'bignumber.js';
import clsx from 'clsx';
import dayjs from 'dayjs';
import React, { useMemo, useState } from 'react';
import { CommonTable } from '../CommonTable';
import { useThemeMode } from '@/ui/hooks/usePreference';
import { useTranslation } from 'react-i18next';
import { PerpsBlueBorderedButton } from '@/ui/views/Perps/components/BlueBorderedButton';
import { usePerpsProPosition } from '@/ui/views/DesktopPerps/hooks/usePerpsProPosition';

export const OpenOrders: React.FC = () => {
  const { openOrders: orders, marketDataMap } = useRabbySelector(
    (store) => store.perps
  );

  const { isDarkTheme } = useThemeMode();
  const { t } = useTranslation();
  const dispatch = useRabbyDispatch();

  const { handleCancelOrder } = usePerpsProPosition();

  const handleCloseAll = useMemoizedFn(async () => {
    await handleCancelOrder(
      orders.map((order) => ({ oid: order.oid, coin: order.coin }))
    );
  });

  const handleClickCloseAll = useMemoizedFn(async () => {
    const modal = Modal.info({
      width: 360,
      closable: false,
      maskClosable: true,
      centered: true,
      title: null,
      bodyStyle: {
        padding: 0,
      },
      className: clsx(
        'perps-bridge-swap-modal perps-close-all-position-modal',
        isDarkTheme
          ? 'perps-bridge-swap-modal-dark'
          : 'perps-bridge-swap-modal-light'
      ),
      content: (
        <>
          <div className="flex items-center justify-center flex-col gap-12 bg-r-neutral-bg2 rounded-lg">
            <div className="text-[17px] font-bold text-r-neutral-title-1 text-center">
              {t('page.perps.cancelAllOrdersPopup.title')}
            </div>
            <div className="text-15 font-medium text-r-neutral-title-1 text-center">
              {t('page.perps.cancelAllOrdersPopup.description')}
            </div>
            <div className="flex items-center justify-center w-full gap-12 mt-20">
              <PerpsBlueBorderedButton
                block
                onClick={() => {
                  modal.destroy();
                }}
              >
                {t('page.manageAddress.cancel')}
              </PerpsBlueBorderedButton>
              <Button
                size="large"
                block
                type="primary"
                onClick={async () => {
                  handleCloseAll();
                  modal.destroy();
                }}
              >
                {t('page.manageAddress.confirm')}
              </Button>
            </div>
          </div>
        </>
      ),
    });
  });

  const columns = useMemo<ColumnType<OpenOrder>[]>(
    () => [
      {
        title: t('page.perpsPro.userInfo.openOrders.order'),
        width: 100,
        className: 'relative',
        key: 'side',
        dataIndex: 'side',
        sorter: (a, b) => a.side.localeCompare(b.side),
        render: (_, record) => {
          // const isTpSL =
          //   record.orderType.includes('Take Profit') ||
          //   record.orderType.includes('Stop') ||
          const isReduceOnly = record.reduceOnly;
          return (
            <div
              className={clsx(
                'absolute top-0 left-0 right-0 bottom-0',
                'flex flex-col justify-center',
                'pl-[16px] py-[8px]',
                record.side === 'B' ? 'is-long-bg' : 'is-short-bg'
              )}
            >
              <div className="text-[13px] leading-[16px] font-semibold text-r-neutral-title-1 mb-[2px]">
                {record.coin}{' '}
                {record.side === 'B'
                  ? isReduceOnly
                    ? 'Close Short'
                    : 'Long'
                  : isReduceOnly
                  ? 'Close Long'
                  : 'Short'}
              </div>
            </div>
          );
        },
      },
      {
        title: t('page.perpsPro.userInfo.openOrders.time'),
        width: 160,
        key: 'timestamp',
        dataIndex: 'timestamp',
        sorter: (a, b) => a.timestamp - b.timestamp,
        render: (_, record) => {
          return (
            <div className="text-[12px] leading-[14px] font-medium text-rb-neutral-foot">
              {dayjs(record.timestamp).format('YYYY/MM/DD HH:mm:ss')}
            </div>
          );
        },
      },
      {
        title: t('page.perpsPro.userInfo.openOrders.type'),
        width: 130,
        key: 'orderType',
        dataIndex: 'orderType',
        sorter: (a, b) => a.orderType.localeCompare(b.orderType),
        render: (_, record) => {
          return (
            <div className="text-[12px] leading-[14px] font-medium text-rb-neutral-foot">
              {record.orderType}
            </div>
          );
        },
      },
      {
        title: t('page.perpsPro.userInfo.openOrders.orderValueSize'),
        width: 180,
        key: 'origSz',
        dataIndex: 'origSz',
        sorter: (a, b) => Number(a.origSz) - Number(b.origSz),
        render: (_, record) => {
          return Number(record.origSz) === 0 ? (
            <div className="space-y-[4px]">
              <div className="text-[12px] leading-[14px] font-medium text-r-neutral-title-1">
                -
              </div>
              <div className="text-[12px] leading-[14px] font-medium text-rb-neutral-foot">
                -
              </div>
            </div>
          ) : (
            <div className="space-y-[4px]">
              <div className="text-[12px] leading-[14px] font-medium text-r-neutral-title-1">
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
        title: t('page.perpsPro.userInfo.openOrders.filled'),
        width: 120,
        key: 'sz',
        dataIndex: 'sz',
        sorter: (a, b) => Number(a.sz) - Number(b.sz),
        render: (_, record) => {
          // todo
          return (
            <div className="text-[12px] leading-[14px] font-medium text-r-neutral-title-1">
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
        title: t('page.perpsPro.userInfo.openOrders.price'),
        width: 120,
        key: 'limitPx',
        dataIndex: 'limitPx',
        render: (_, record) => {
          return (
            <div className="text-[12px] leading-[14px] font-medium text-r-neutral-title-1">
              {record.orderType.includes('Market')
                ? 'Market'
                : `$${splitNumberByStep(record.limitPx)}`}
            </div>
          );
        },
      },
      {
        title: t('page.perpsPro.userInfo.openOrders.reduceOnly'),
        width: 100,
        sorter: (a, b) => Number(a.reduceOnly) - Number(b.reduceOnly),
        key: 'reduceOnly',
        dataIndex: 'reduceOnly',
        render: (_, record) => {
          return (
            <div className="text-[12px] leading-[14px] font-medium text-r-neutral-title-1">
              {record.reduceOnly ? 'Yes' : 'No'}
            </div>
          );
        },
      },
      {
        title: t('page.perpsPro.userInfo.openOrders.triggerConditions'),
        width: 180,
        key: 'triggerCondition',
        dataIndex: 'triggerCondition',
        render: (_, record) => {
          return (
            <div className="text-[12px] leading-[14px] font-medium text-rb-neutral-foot">
              {record.triggerCondition}
            </div>
          );
        },
      },
      {
        title: t('page.perpsPro.userInfo.openOrders.tpSl'),
        width: 180,
        key: 'children',
        dataIndex: 'children',
        render: (_, record) => {
          // todo
          const tpItem = record.children?.find(
            (order) =>
              order.orderType === 'Take Profit Market' &&
              order.isTrigger &&
              order.reduceOnly
          );

          const slItem = record.children?.find(
            (order) =>
              order.orderType === 'Stop Market' &&
              order.isTrigger &&
              order.reduceOnly
          );

          const tpExpectedPnL = tpItem?.triggerPx
            ? new BigNumber(tpItem.triggerPx)
                .minus(record.limitPx)
                .times(record.origSz)
                .toFixed(2)
            : '';

          const slExpectedPnL = slItem?.triggerPx
            ? new BigNumber(slItem.triggerPx)
                .minus(record.limitPx)
                .times(record.origSz)
                .toFixed(2)
            : '';

          return (
            <div className="space-y-[4px]">
              <div className="text-[12px] leading-[14px] font-medium text-r-neutral-title-1">
                {tpItem?.triggerPx
                  ? `$${splitNumberByStep(tpItem.triggerPx)} `
                  : '-'}
              </div>

              <div className="text-[12px] leading-[14px] font-medium text-r-neutral-title-1">
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
          <div
            className="text-r-blue-default cursor-pointer underline"
            onClick={handleClickCloseAll}
          >
            {t('page.perpsPro.userInfo.openOrders.cancelAll')}
          </div>
        ),
        align: 'center',
        width: 120,
        key: 'oid',
        dataIndex: 'oid',
        render: (_, record) => {
          return (
            <button
              type="button"
              className={clsx(
                'bg-rb-neutral-bg-4 rounded-[8px] py-[9px] px-[12px] min-w-[88px]',
                'text-[12px] leading-[14px] font-medium text-r-neutral-title-1'
              )}
              onClick={() => {
                handleCancelOrder([{ oid: record.oid, coin: record.coin }]);
              }}
            >
              {t('page.perpsPro.userInfo.openOrders.cancel')}
            </button>
          );
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
        rowKey="oid"
        expandable={{
          childrenColumnName: '__not_exist__',
        }}
        showSorterTooltip={false}
      ></CommonTable>
    </>
  );
};
