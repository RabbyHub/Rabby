import { MarketData, PositionAndOpenOrder } from '@/ui/models/perps';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { formatUsdValue, sleep, splitNumberByStep } from '@/ui/utils';
import { Button, Dropdown, Menu, message, Modal, Table, Tooltip } from 'antd';
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
import { RcIconArrowDownCC, RcIconEditCC } from '@/ui/assets/desktop/common';
import { EditMarginModal } from '../../../modal/EditMarginModal';
import { EditTpSlModal } from '../../../modal/EditTpSLModal';
import { useMemoizedFn } from 'ahooks';
import { getPerpsSDK } from '@/ui/views/Perps/sdkManager';
import { useTranslation } from 'react-i18next';
import { usePerpsPosition } from '@/ui/views/Perps/hooks/usePerpsPosition';
import { noop, set } from 'lodash';
import { PerpsBlueBorderedButton } from '@/ui/views/Perps/components/BlueBorderedButton';
import { useThemeMode } from '@/ui/hooks/usePreference';
import * as Sentry from '@sentry/browser';
import { ClosePositionModal } from '../../../modal/ClosePositionModal';

export const PositionsInfo: React.FC = () => {
  const {
    positionAndOpenOrders,
    marketDataMap,
    accountSummary,
    wsActiveAssetCtx,
  } = useRabbySelector((store) => store.perps);

  console.log('positionAndOpenOrders', positionAndOpenOrders);
  const { t } = useTranslation();
  const dispatch = useRabbyDispatch();

  const [editMarginVisible, setEditMarginVisible] = useState(false);
  const [editTpSlVisible, setEditTpSlVisible] = useState(false);
  const [closePositionVisible, setClosePositionVisible] = useState(false);
  const [closePositionType, setClosePositionType] = useState<
    'limit' | 'market' | 'reverse'
  >('market');
  const [currentAssetCtx, setCurrentAssetCtx] = useState<MarketData | null>(
    null
  );
  const [
    currentPosition,
    setCurrentPosition,
  ] = useState<PositionAndOpenOrder | null>(null);

  const { handleUpdateMargin, handleClosePosition } = usePerpsPosition({
    setCurrentTpOrSl: noop,
  });

  const { isDarkTheme } = useThemeMode();

  const handleCloseAllPosition = useMemoizedFn(async () => {
    try {
      const sdk = getPerpsSDK();
      for (const item of positionAndOpenOrders) {
        await handleClosePosition({
          coin: item.position.coin,
          size: Math.abs(Number(item.position.szi || 0)).toString() || '0',
          direction: Number(item.position.szi || 0) > 0 ? 'Long' : 'Short',
          price: marketDataMap[item.position.coin.toUpperCase()]?.markPx || '0',
        });
        await sleep(10);
      }
      dispatch.perps.fetchClearinghouseState();
    } catch (error) {
      console.error('close all position error', error);
      message.error({
        // className: 'toast-message-2025-center',
        duration: 1.5,
        content: error?.message || 'close all position error',
      });
      Sentry.captureException(
        new Error(
          'PERPS close all position error' + 'error: ' + JSON.stringify(error)
        )
      );
    }
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
              {t('page.perps.closeAllPopup.title')}
            </div>
            <div className="text-15 font-medium text-r-neutral-title-1 text-center">
              {t('page.perps.closeAllPopup.description')}
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
                  handleCloseAllPosition();
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
        width: 120,
        className: 'relative',
        key: 'coin',
        dataIndex: 'coin',
        sorter: (a, b) => a.position.coin.localeCompare(b.position.coin),
        render: (_, record) => {
          return (
            <div
              className={clsx(
                'absolute top-0 left-0 right-0 bottom-0',
                'flex flex-col justify-center',
                'pl-[16px] py-[8px]',
                Number(record.position.szi) > 0 ? 'is-long-bg' : 'is-short-bg'
              )}
            >
              <div>
                <div className="text-[13px] leading-[16px] font-semibold text-r-neutral-title-1 mb-[2px]">
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
        key: 'positionValue',
        dataIndex: 'positionValue',
        sorter: (a, b) =>
          Number(a.position.positionValue) - Number(b.position.positionValue),
        render: (_, record) => {
          return (
            <div>
              <div className="text-[12px] leading-[14px] font-medium text-r-neutral-title-1 mb-[4px]">
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
        key: 'entryPx',
        dataIndex: 'entryPx',
        sorter: (a, b) =>
          Number(a.position.entryPx) - Number(b.position.entryPx),
        width: 160,
        render: (_, record) => {
          const marketData = marketDataMap[record.position.coin || ''] || {};
          return (
            <div>
              <div className="text-[12px] leading-[14px] font-medium text-r-neutral-title-1 mb-[4px]">
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
        key: 'unrealizedPnl',
        dataIndex: 'unrealizedPnl',
        sorter: (a, b) =>
          Number(a.position.unrealizedPnl) - Number(b.position.unrealizedPnl),
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
        key: 'liquidationPx',
        dataIndex: 'liquidationPx',
        sorter: (a, b) =>
          Number(a.position.liquidationPx) - Number(b.position.liquidationPx),
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
              <div className="text-[12px] leading-[14px] font-medium text-r-neutral-title-1">
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
        key: 'marginUsed',
        dataIndex: 'marginUsed',
        sorter: (a, b) =>
          Number(a.position.marginUsed) - Number(b.position.marginUsed),
        render: (_, record) => {
          return (
            <div className="flex items-center gap-[12px]">
              <div>
                <div className="text-[12px] leading-[14px] font-medium text-r-neutral-title-1 mb-[4px]">
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
        key: 'fundingPayments',
        dataIndex: 'fundingPayments',
        sorter: (a, b) =>
          Number(a.position.cumFunding.sinceOpen) -
          Number(b.position.cumFunding.sinceOpen),
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
        key: 'children',
        dataIndex: 'children',
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
                <div className="text-[12px] leading-[14px] font-medium text-r-neutral-title-1">
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
                <div className="text-[12px] leading-[14px] font-medium text-r-neutral-title-1">
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
          <div
            className="text-r-blue-default cursor-pointer underline"
            onClick={handleClickCloseAll}
          >
            Close All
          </div>
        ),
        key: 'oid',
        dataIndex: 'oid',
        align: 'center',
        width: 160,
        render: (_, record) => {
          return (
            <Dropdown
              overlay={
                <Menu
                  onClick={(info) => {
                    setCurrentPosition(record);
                    setCurrentAssetCtx(marketDataMap[record.position.coin]);
                    setClosePositionType(
                      info.key as 'limit' | 'market' | 'reverse'
                    );
                    setClosePositionVisible(true);
                  }}
                >
                  <Menu.Item key="reverse">Reverse</Menu.Item>
                  <Menu.Item key="limit">Close limit</Menu.Item>
                  <Menu.Item key="market">Close market</Menu.Item>
                </Menu>
              }
            >
              <button
                type="button"
                className={clsx(
                  'inline-flex items-center justify-between',
                  'pl-[8px] pr-[4px] py-[8px] w-[88px]',
                  'border border-rb-neutral-line rounded-[6px]',
                  'text-[12px] leading-[14px] font-medium text-rb-neutral-title-1'
                )}
              >
                Close
                <RcIconArrowDownCC className="text-rb-neutral-secondary" />
              </button>
            </Dropdown>
          );
        },
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
        showSorterTooltip={false}
      ></CommonTable>
      {currentAssetCtx && positionData && currentPosition && (
        <>
          <EditMarginModal
            visible={editMarginVisible}
            coin={currentPosition?.position?.coin || ''}
            currentAssetCtx={currentAssetCtx}
            activeAssetCtx={wsActiveAssetCtx?.ctx || null}
            direction={positionData.direction as 'Long' | 'Short'}
            entryPrice={positionData.entryPrice}
            leverage={positionData.leverage}
            availableBalance={Number(accountSummary?.withdrawable || 0)}
            liquidationPx={Number(currentPosition?.position.liquidationPx || 0)}
            positionSize={positionData.size}
            marginUsed={positionData.marginUsed}
            pnlPercent={positionData.pnlPercent}
            pnl={positionData.pnl}
            onCancel={() => setEditMarginVisible(false)}
            onConfirm={async (action: 'add' | 'reduce', margin: number) => {
              await handleUpdateMargin(
                currentPosition.position.coin,
                action,
                margin
              );
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
            onConfirm={() => setEditTpSlVisible(false)}
          />
          <ClosePositionModal
            type={closePositionType}
            position={currentPosition.position}
            marketData={currentAssetCtx}
            visible={closePositionVisible}
            onCancel={() => setClosePositionVisible(false)}
            onConfirm={() => {
              setClosePositionVisible(false);
            }}
          />
        </>
      )}
    </>
  );
};
