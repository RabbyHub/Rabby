import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import React, { useMemo, useState } from 'react';
import { CommonTable } from '../CommonTable';
import { ColumnType } from 'antd/lib/table';
import {
  UserTwapHistory,
  UserTwapSliceFill,
} from '@rabby-wallet/hyperliquid-sdk';
import clsx from 'clsx';
import dayjs from 'dayjs';
import { splitNumberByStep } from '@/ui/utils';
import BigNumber from 'bignumber.js';
import { Button } from 'antd';
import { ReactComponent as RcIconArrowDown } from '@/ui/assets/perps/icon-arrow-down.svg';
import { getPerpsSDK } from '@/ui/views/Perps/sdkManager';
import { useMemoizedFn } from 'ahooks';
import { useTranslation } from 'react-i18next';
import { usePerpsProPosition } from '../../../hooks/usePerpsProPosition';

type TwapOrder = {
  twapId: number;
  coin: string;
  side: 'A' | 'B';
  sz: string;
  executedSz: string;
  executedNtl: string;
  minutes: number;
  reduceOnly: boolean;
  randomize: boolean;
  timestamp: number;
  status: 'activated' | 'finished' | 'terminated';
  slices: UserTwapSliceFill[];
};

export const Twap: React.FC = () => {
  const {
    twapStates,
    twapHistory,
    twapSliceFills,
    marketDataMap,
  } = useRabbySelector((store) => store.perps);
  const { t } = useTranslation();
  const dispatch = useRabbyDispatch();
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);

  // Merge twapStates and twapHistory
  const activeTwapOrders = useMemo(() => {
    const orders: TwapOrder[] = [];

    // Process twapStates (active orders)
    twapStates.forEach(([twapId, state]) => {
      const slices = twapSliceFills.filter((fill) => fill.twapId === twapId);
      orders.push({
        twapId,
        coin: state.coin,
        side: state.side,
        sz: state.sz,
        executedSz: state.executedSz,
        executedNtl: state.executedNtl,
        minutes: state.minutes,
        reduceOnly: state.reduceOnly,
        randomize: state.randomize,
        timestamp: state.timestamp,
        status: 'activated',
        slices,
      });
    });

    return orders;
  }, [twapStates, twapHistory, twapSliceFills]);

  const historyTwapOrders = useMemo(() => {
    const orders: TwapOrder[] = [];
    twapHistory.forEach((history) => {
      if (history.status.status === 'activated') {
        return;
      }

      const slices = twapSliceFills.filter(
        (fill) => fill.twapId === history.twapId
      );
      orders.push({
        twapId: history.twapId,
        coin: history.state.coin,
        side: history.state.side,
        sz: history.state.sz,
        executedSz: history.state.executedSz,
        executedNtl: history.state.executedNtl,
        minutes: history.state.minutes,
        reduceOnly: history.state.reduceOnly,
        randomize: history.state.randomize,
        timestamp: history.state.timestamp,
        status: history.status.status,
        slices,
      });
    });

    return orders;
  }, [twapHistory, twapSliceFills]);

  // Filter by tab
  const filteredOrders = useMemo(() => {
    if (activeTab === 'active') {
      return activeTwapOrders;
    }
    return historyTwapOrders;
  }, [activeTwapOrders, historyTwapOrders, activeTab]);

  const { handleCancelTWAPOrder } = usePerpsProPosition();

  const calculateAveragePrice = (order: TwapOrder) => {
    if (!order.slices.length || Number(order.executedSz) === 0) {
      return '-';
    }

    let totalNotional = new BigNumber(0);
    let totalSize = new BigNumber(0);

    order.slices.forEach((slice) => {
      const px = new BigNumber(slice.fill.px);
      const sz = new BigNumber(slice.fill.sz);
      totalNotional = totalNotional.plus(px.times(sz));
      totalSize = totalSize.plus(sz);
    });

    if (totalSize.isZero()) {
      return '-';
    }

    const pxDecimals = marketDataMap[order.coin.toUpperCase()]?.pxDecimals || 2;

    return `$${splitNumberByStep(
      totalNotional.dividedBy(totalSize).toFixed(pxDecimals)
    )}`;
  };

  const calculateRunningTime = (order: TwapOrder) => {
    const now = Date.now();
    const startTime = order.timestamp;
    const elapsedSeconds = Math.floor((now - startTime) / 1000);
    const totalSeconds = order.minutes * 60;

    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${String(mins).padStart(2, '0')}:${String(secs).padStart(
        2,
        '0'
      )}`;
    };

    if (activeTab === 'active') {
      return `${formatTime(elapsedSeconds)} / ${formatTime(totalSeconds)}`;
    }

    return `${formatTime(totalSeconds)} / ${formatTime(totalSeconds)}`;
  };

  const columns = useMemo<ColumnType<TwapOrder>[]>(
    () => [
      {
        title: t('page.perpsPro.userInfo.tab.coin'),
        dataIndex: 'coin',
        key: 'coin',
        width: 200,
        sorter: (a, b) => a.coin.localeCompare(b.coin),
        render: (_, record) => {
          const isExpanded = expandedRowKeys.includes(
            `${record.twapId}-${record.status}`
          );
          const sideName = record.side === 'B' ? 'Long' : 'Short';
          const sliceCount = record.slices.length;
          const canExpand = record.slices.length > 0;

          return (
            <div
              className={clsx(
                'absolute top-0 left-0 right-0 bottom-0',
                'flex flex-col justify-center',
                'pl-[16px] py-[8px]',
                record.side === 'B' ? 'is-long-bg' : 'is-short-bg'
              )}
            >
              <div
                className={clsx(
                  'flex items-center gap-[4px]',
                  canExpand && 'cursor-pointer'
                )}
                onClick={() => {
                  if (!canExpand) {
                    return;
                  }

                  setExpandedRowKeys((prev) =>
                    prev.includes(`${record.twapId}-${record.status}`)
                      ? prev.filter(
                          (key) => key !== `${record.twapId}-${record.status}`
                        )
                      : [...prev, `${record.twapId}-${record.status}`]
                  );
                }}
              >
                <div className="flex flex-row items-center gap-[4px]">
                  <div className="text-[13px] leading-[16px] font-semibold text-r-neutral-title-1">
                    <span
                      className="cursor-pointer hover:font-bold hover:text-rb-neutral-body"
                      onClick={(e) => {
                        e.stopPropagation();
                        dispatch.perps.setSelectedCoin(record.coin);
                      }}
                    >
                      {record.coin}{' '}
                    </span>
                  </div>
                  <div className="text-[12px] leading-[14px] text-r-neutral-foot">
                    {sideName} · ({sliceCount} slices)
                  </div>
                </div>
                {canExpand && (
                  <RcIconArrowDown
                    className={clsx(
                      'text-r-neutral-body',
                      isExpanded && 'rotate-180'
                    )}
                  />
                )}
              </div>
            </div>
          );
        },
      },
      {
        title: t('page.perpsPro.userInfo.tab.size'),
        dataIndex: 'sz',
        key: 'sz',
        width: 150,
        sorter: (a, b) => Number(a.sz) - Number(b.sz),
        render: (_, record) => {
          const executedPct = new BigNumber(record.executedSz)
            .dividedBy(record.sz)
            .times(100)
            .toFixed(1);

          return (
            <div className="text-[12px] leading-[14px] font-510 flex flex-col gap-[4px] text-rb-neutral-title-1">
              <div className="flex items-center gap-[4px]">
                {record.executedSz}
                {record.randomize && (
                  <span className="text-rb-orange-default text-[12px] leading-[14px] font-normal">
                    {t('page.perpsPro.userInfo.randomized')}
                  </span>
                )}
              </div>
              <div className="text-rb-neutral-foot">
                {record.executedSz} / {Number(record.sz)}
              </div>
            </div>
          );
        },
      },
      {
        title: t('page.perpsPro.userInfo.tab.averagePrice'),
        key: 'avgPrice',
        width: 130,
        render: (_, record) => {
          return (
            <div className="text-[12px] leading-[14px] font-510 text-r-neutral-title-1">
              {calculateAveragePrice(record)}
            </div>
          );
        },
      },
      {
        title: t('page.perpsPro.userInfo.tab.runningTimeTotal'),
        key: 'runningTime',
        width: 180,
        render: (_, record) => {
          return (
            <div className="text-[12px] leading-[14px] font-510 text-r-neutral-title-1">
              {calculateRunningTime(record)}
            </div>
          );
        },
      },
      {
        title: t('page.perpsPro.userInfo.tab.status'),
        dataIndex: 'status',
        key: 'status',
        width: 120,
        sorter: (a, b) => a.status.localeCompare(b.status),
        render: (_, record) => {
          const statusText =
            record.status === 'activated'
              ? t('page.perpsPro.userInfo.twap.activated')
              : record.status === 'finished'
              ? t('page.perpsPro.userInfo.twap.completed')
              : t('page.perpsPro.userInfo.twap.terminated');

          const statusColor =
            record.status === 'activated'
              ? 'text-rb-green-default'
              : record.status === 'finished'
              ? 'text-rb-neutral-foot'
              : 'text-rb-red-default';

          return (
            <div
              className={clsx(
                'text-[12px] leading-[14px] font-510',
                statusColor
              )}
            >
              {statusText}
            </div>
          );
        },
      },
      {
        title: t('page.perpsPro.userInfo.tab.reduceOnly'),
        dataIndex: 'reduceOnly',
        key: 'reduceOnly',
        width: 100,
        sorter: (a, b) => Number(a.reduceOnly) - Number(b.reduceOnly),
        render: (_, record) => {
          return (
            <div className="text-[12px] leading-[14px] font-510 text-r-neutral-title-1">
              {record.reduceOnly
                ? t('page.perpsPro.userInfo.yes')
                : t('page.perpsPro.userInfo.no')}
            </div>
          );
        },
      },
      {
        title: t('page.perpsPro.userInfo.tab.creationTime'),
        key: 'creationTime',
        width: 180,
        sorter: (a, b) => a.timestamp - b.timestamp,
        render: (_, record) => {
          return (
            <div className="text-[12px] leading-[14px] font-510 text-r-neutral-title-1">
              {dayjs(record.timestamp).format('DD/MM/YYYY-hh:mm:ss A')}
            </div>
          );
        },
      },
      // {
      //   title: 'Errors',
      //   key: 'errors',
      //   width: 80,
      //   render: () => {
      //     return (
      //       <div className="text-[12px] leading-[14px] font-510 text-r-neutral-title-1">
      //         -
      //       </div>
      //     );
      //   },
      // },
      {
        title: t('page.perpsPro.userInfo.tab.terminate'),
        key: 'terminate',
        width: 100,
        render: (_, record) => {
          if (activeTab === 'history') {
            return <div className="text-[12px] text-r-neutral-foot">-</div>;
          }

          return (
            <div className="flex items-center">
              <div
                className="text-[12px] px-[16px] h-[28px] flex items-center justify-center bg-rb-red-light-1 text-rb-red-default cursor-pointer rounded-[8px]"
                onClick={() =>
                  handleCancelTWAPOrder({
                    coin: record.coin,
                    twapId: record.twapId,
                  })
                }
              >
                {t('page.perpsPro.userInfo.terminate')}
              </div>
            </div>
          );
        },
      },
    ],
    [expandedRowKeys, handleCancelTWAPOrder, activeTab]
  );

  // Expanded row render
  const expandedRowRender = (record: TwapOrder) => {
    const sliceColumns: ColumnType<UserTwapSliceFill>[] = [
      {
        title: t('page.perpsPro.userInfo.tab.slice'),
        key: 'index',
        width: 200,
        render: (_, __, index) => (
          <div className="text-[12px] leading-[14px] text-rb-neutral-foot">
            Slice #{index + 1}
          </div>
        ),
      },
      {
        title: t('page.perpsPro.userInfo.tab.size'),
        width: 150,
        render: (_, slice) => (
          <div className="text-[12px] leading-[14px] text-rb-neutral-foot">
            {splitNumberByStep(Number(slice.fill.sz))} {record.coin}
          </div>
        ),
      },
      {
        title: t('page.perpsPro.userInfo.tab.averagePrice'),
        width: 130,
        render: (_, slice) => (
          <div className="text-[12px] leading-[14px] text-rb-neutral-foot">
            ${splitNumberByStep(Number(slice.fill.px))}
          </div>
        ),
      },
      {
        title: t('page.perpsPro.userInfo.tab.runningTimeTotal'),
        width: 180,
        render: (_, slice) => {
          const sliceTime = dayjs(slice.fill.time).format('HH:mm:ss');
          return (
            <div className="text-[12px] leading-[14px] text-rb-neutral-foot">
              {sliceTime}
            </div>
          );
        },
      },
      {
        title: t('page.perpsPro.userInfo.tab.status'),
        width: 120,
        render: () => (
          <div className="text-[12px] leading-[14px] text-rb-neutral-foot">
            -
          </div>
        ),
      },
      {
        title: t('page.perpsPro.userInfo.tab.reduceOnly'),
        width: 100,
        render: () => (
          <div className="text-[12px] leading-[14px] text-rb-neutral-foot">
            -
          </div>
        ),
      },
      {
        title: t('page.perpsPro.userInfo.tab.creationTime'),
        width: 180,
        render: (_, slice) => (
          <div className="text-[12px] leading-[14px] text-rb-neutral-foot">
            -
          </div>
        ),
      },
      // {
      //   title: 'Errors',
      //   width: 80,
      //   render: () => (
      //     <div className="text-[12px] leading-[14px] text-rb-neutral-foot">
      //       -
      //     </div>
      //   ),
      // },
      {
        title: '',
        width: 100,
        render: () => null,
      },
    ];

    return (
      <CommonTable
        dataSource={record.slices}
        columns={sliceColumns}
        pagination={false}
        showHeader={false}
        rowKey={(slice) =>
          `${record.twapId}-${record.status}-${slice.fill.tid}`
        }
      />
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div
        className="flex bg-rb-neutral-bg-4 p-[2px] rounded-[8px] ml-16 mt-10"
        style={{ width: 'fit-content' }}
      >
        <div
          className={clsx(
            'px-[8px] py-[6px] text-[12px] font-510 cursor-pointer',
            activeTab === 'active'
              ? 'text-rb-neutral-body bg-rb-neutral-bg-1 rounded-[8px]'
              : 'text-r-neutral-foot bg-rb-neutral-bg-4'
          )}
          onClick={() => setActiveTab('active')}
        >
          {t('page.perpsPro.userInfo.active')}
        </div>
        <div
          className={clsx(
            'px-[8px] py-[6px] text-[12px] font-510 cursor-pointer',
            activeTab === 'history'
              ? 'text-rb-neutral-body bg-rb-neutral-bg-1 rounded-[8px]'
              : 'text-r-neutral-foot bg-rb-neutral-bg-4'
          )}
          onClick={() => setActiveTab('history')}
        >
          {t('page.perpsPro.userInfo.history')}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <CommonTable
          emptyMessage={
            activeTab === 'active'
              ? t('page.perpsPro.userInfo.emptyMessage.activeTwap')
              : t('page.perpsPro.userInfo.emptyMessage.twapHistory')
          }
          dataSource={filteredOrders}
          columns={columns}
          pagination={false}
          bordered={false}
          showSorterTooltip={false}
          rowKey={(record) => `${record.twapId}-${record.status}`}
          defaultSortField="creationTime"
          defaultSortOrder="descend"
          expandable={{
            expandedRowKeys,
            expandedRowRender,
            expandIconColumnIndex: -1,
          }}
        />
      </div>
    </div>
  );
};
