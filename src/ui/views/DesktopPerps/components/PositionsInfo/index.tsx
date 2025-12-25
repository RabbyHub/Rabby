import { MarketData, PositionAndOpenOrder } from '@/ui/models/perps';
import { useRabbySelector } from '@/ui/store';
import { formatUsdValue, splitNumberByStep } from '@/ui/utils';
import { Table, Tooltip } from 'antd';
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
import { EditMarginModal } from '../../modal/EditMarginModal';
import { EditTpSlModal } from '../../modal/EditTpSLModal';
import { set } from 'lodash';

export const PositionsInfo: React.FC = () => {
  const {
    positionAndOpenOrders,
    marketDataMap,
    accountSummary,
  } = useRabbySelector((store) => store.perps);

  console.log('positionAndOpenOrders', positionAndOpenOrders);

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
                'mx-[-8px] my-[-8px]',
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
                {Math.abs(Number(record.position.returnOnEquity) * 100).toFixed(
                  2
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
          const percent = formatPerpsPct(
            calculateDistanceToLiquidation(
              record.position.liquidationPx,
              marketDataMap[record.position.coin || '']?.markPx || 0
            )
          );
          const isLong = Number(record.position.szi) > 0;
          return (
            <div className="flex items-center gap-[4px]">
              <div className="text-[12px] leading-[14px] font-medium text-rb-neutral-title-1">
                $
                {splitNumberByStep(
                  Number(record.position.liquidationPx || 0).toFixed(2)
                )}
              </div>

              <Tooltip
                overlayClassName="rectangle"
                title={
                  isLong
                    ? `Going down ${percent} will trigger liquidation`
                    : `Going up ${percent} will trigger liquidation`
                }
              >
                <div className="flex items-center gap-[2px] border border-rb-neutral-line rounded-[4px] px-[4px]">
                  <RcIconAlarmCC className="text-rb-neutral-info" />
                  <div className="text-rb-neutral-foot font-medium text-[12px] leading-[16px]">
                    {percent}
                  </div>
                </div>
              </Tooltip>
            </div>
          );
        },
      },
      {
        title: 'Margin',
        width: 160,
        render: (_, record) => {
          return (
            <div className="flex items-center gap-[12px]">
              <div>
                <div className="text-[12px] leading-[14px] font-medium text-rb-neutral-title-1 mb-[4px]">
                  {formatUsdValue(Number(record.position.marginUsed || 0))}
                </div>
                <div className="text-[12px] leading-[14px] font-medium text-rb-neutral-foot">
                  {record.position.leverage.type === 'cross'
                    ? 'Cross'
                    : 'Isolated'}
                </div>
              </div>
              <RcIconEditCC
                className="text-rb-neutral-foot cursor-pointer hover:text-r-blue-default"
                onClick={() => {
                  setCurrentAssetCtx(marketDataMap[record.position.coin]);
                  setCurrentPosition(record);
                  setEditMarginVisible(true);
                }}
              />
            </div>
          );
        },
      },
      {
        title: 'Funding',
        width: 160,
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
        render: (_, record) => {
          const currentPosition = record;
          const { tpPrice, slPrice, tpOid, slOid } = (() => {
            if (
              !currentPosition ||
              !currentPosition.openOrders ||
              !currentPosition.openOrders.length
            ) {
              return {
                tpPrice: undefined,
                slPrice: undefined,
                tpOid: undefined,
                slOid: undefined,
              };
            }

            const tpItem = currentPosition.openOrders.find(
              (order) =>
                order.orderType === 'Take Profit Market' &&
                order.isTrigger &&
                order.reduceOnly
            );

            const slItem = currentPosition.openOrders.find(
              (order) =>
                order.orderType === 'Stop Market' &&
                order.isTrigger &&
                order.reduceOnly
            );

            return {
              tpPrice: tpItem?.triggerPx,
              slPrice: slItem?.triggerPx,
              tpOid: tpItem?.oid,
              slOid: slItem?.oid,
            };
          })();

          const positionData = record.position;
          const entryPrice = Number(positionData.entryPx);
          const size = Math.abs(Number(currentPosition.position.szi || 0));

          const isLong = (+positionData.szi || 0) > 0;
          // Calculate expected PNL for take profit
          const takeProfitExpectedPnl = (() => {
            if (!tpPrice || !positionData) {
              return null;
            }
            const pnlUsdValue = isLong
              ? (Number(tpPrice) - entryPrice) * size
              : (entryPrice - Number(tpPrice)) * size;
            return pnlUsdValue;
          })();

          // Calculate expected PNL for stop loss
          const stopLossExpectedPnl = (() => {
            if (!slPrice || !positionData) {
              return null;
            }
            const pnlUsdValue = isLong
              ? (Number(slPrice) - entryPrice) * size
              : (entryPrice - Number(slPrice)) * size;
            return pnlUsdValue;
          })();

          return (
            <div className="flex items-center gap-[12px]">
              <div className="flex flex-col gap-[4px]">
                <div className="text-[12px] leading-[14px] font-medium text-rb-neutral-title-1">
                  {tpPrice ? (
                    <div>
                      ${splitNumberByStep(tpPrice)}{' '}
                      {takeProfitExpectedPnl ? (
                        <span
                          className={
                            takeProfitExpectedPnl >= 0
                              ? 'text-r-green-default'
                              : 'text-r-red-default'
                          }
                        >
                          ({takeProfitExpectedPnl >= 0 ? '+' : '-'}
                          {formatUsdValue(Math.abs(takeProfitExpectedPnl))})
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <div className="text-[12px] leading-[14px] font-medium text-rb-neutral-foot">
                      no TP
                    </div>
                  )}
                </div>
                <div className="text-[12px] leading-[14px] font-medium text-rb-neutral-title-1">
                  {slPrice ? (
                    <div>
                      ${splitNumberByStep(slPrice)}{' '}
                      {stopLossExpectedPnl ? (
                        <span
                          className={
                            stopLossExpectedPnl >= 0
                              ? 'text-r-green-default'
                              : 'text-r-red-default'
                          }
                        >
                          ({stopLossExpectedPnl >= 0 ? '+' : '-'}
                          {formatUsdValue(Math.abs(stopLossExpectedPnl))})
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <div className="text-[12px] leading-[14px] font-medium text-rb-neutral-foot">
                      no SL
                    </div>
                  )}
                </div>
              </div>
              <RcIconEditCC
                className="text-rb-neutral-foot cursor-pointer hover:text-r-blue-default"
                onClick={() => {
                  setCurrentPosition(record);
                  setCurrentAssetCtx(marketDataMap[record.position.coin]);
                  setEditTpSlVisible(true);
                }}
              />
            </div>
          );
        },
      },
      {
        title: (
          <div className="text-r-blue-default cursor-pointer underline">
            Close All
          </div>
        ),
        align: 'center',
        width: 160,
      },
    ],
    [marketDataMap]
  );
  return (
    <>
      <CommonTable
        dataSource={positionAndOpenOrders}
        columns={columns}
        pagination={false}
        bordered={false}
      ></CommonTable>
      {currentAssetCtx && positionData && currentPosition && (
        <>
          <EditMarginModal
            visible={editMarginVisible}
            coin={currentPosition?.position?.coin || ''}
            currentAssetCtx={currentAssetCtx}
            activeAssetCtx={currentAssetCtx}
            direction={positionData.direction as 'Long' | 'Short'}
            entryPrice={positionData.entryPrice}
            leverage={positionData.leverage}
            availableBalance={Number(accountSummary?.withdrawable || 0)}
            liquidationPx={Number(currentPosition?.position.liquidationPx || 0)}
            positionSize={positionData.size}
            marginUsed={positionData.marginUsed}
            pnlPercent={positionData.pnlPercent}
            pnl={positionData.pnl}
            // handlePressRiskTag={() => setRiskPopupVisible(true)}
            onCancel={() => setEditMarginVisible(false)}
            onConfirm={async (action: 'add' | 'reduce', margin: number) => {
              // await handleUpdateMargin(coin, action, margin);
              setEditMarginVisible(false);
            }}
            handlePressRiskTag={function (): void {
              throw new Error('Function not implemented.');
            }}
          />
          <EditTpSlModal
            position={currentPosition.position}
            marketData={currentAssetCtx}
            visible={editTpSlVisible}
            onCancel={() => setEditTpSlVisible(false)}
            onConfirm={async (action: 'add' | 'reduce', margin: number) => {
              // await handleUpdateMargin(coin, action, margin);
              setEditTpSlVisible(false);
            }}
          />
        </>
      )}
    </>
  );
};
