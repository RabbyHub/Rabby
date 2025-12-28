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

export const OpenOrders: React.FC = () => {
  const { positionAndOpenOrders, marketDataMap } = useRabbySelector(
    (store) => store.perps
  );

  const { isDarkTheme } = useThemeMode();
  const { t } = useTranslation();

  const orders = useMemo(() => {
    return positionAndOpenOrders.flatMap((item) => item.openOrders || []);
  }, [positionAndOpenOrders]);

  const dispatch = useRabbyDispatch();

  const handleCancelOrder = useMemoizedFn(
    async (params: CancelOrderParams[]) => {
      try {
        const sdk = getPerpsSDK();
        const res = await sdk.exchange?.cancelOrder(params);
        if (
          res?.response.data.statuses.every(
            (item) => ((item as unknown) as string) === 'success'
          )
        ) {
          message.success({
            duration: 1.5,
            content: 'canceled successfully',
          });
          setTimeout(() => {
            dispatch.perps.fetchPositionOpenOrders();
          }, 1000);
        } else {
          message.error({
            duration: 1.5,
            content: 'cancel error',
          });
        }
      } catch (error) {
        message.error({
          content: 'cancel error',
        });
      }
    }
  );

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
              {t('page.perps.closeAllPopup.title')} // todo
            </div>
            <div className="text-15 font-medium text-r-neutral-title-1 text-center">
              {t('page.perps.closeAllPopup.description')} // todo
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
        title: 'Order',
        width: 130,
        className: 'relative',
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
        title: 'Time',
        width: 160,
        sorter: (a, b) => a.timestamp - b.timestamp,
        render: (_, record) => {
          return (
            <div className="text-[12px] leading-[14px] font-medium text-rb-neutral-foot">
              {dayjs(record.timestamp).format('DD/MM/YYYY-HH:mm:ss')}
            </div>
          );
        },
      },
      {
        title: 'Type',
        width: 130,
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
        title: 'Order Value / Size',
        width: 180,
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
        title: 'Filled',
        width: 120,
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
        title: 'Price',
        width: 120,
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
        title: 'Reduce Only',
        width: 100,
        sorter: (a, b) => Number(a.reduceOnly) - Number(b.reduceOnly),
        render: (_, record) => {
          return (
            <div className="text-[12px] leading-[14px] font-medium text-r-neutral-title-1">
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
          return (
            <div className="space-y-[4px]">
              <div className="text-[12px] leading-[14px] font-medium text-r-neutral-title-1">
                {tpItem?.triggerPx
                  ? `$${splitNumberByStep(tpItem.triggerPx)}`
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
            Cancel All
          </div>
        ),
        align: 'center',
        width: 120,
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
              Cancel
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
        expandable={{
          childrenColumnName: '__not_exist__',
        }}
        showSorterTooltip={false}
      ></CommonTable>
    </>
  );
};
