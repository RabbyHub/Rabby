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
import { DistanceRiskTag } from './DistanceRiskTag';
import { calculatePnL } from '../../TradingPanel/utils';
import { usePerpsProPosition } from '../../../hooks/usePerpsProPosition';
import { LeverageModal } from '../../TradingPanel/components';
import { MarginMode } from '../../../types';
import { OpenOrder } from '@rabby-wallet/hyperliquid-sdk';

export interface PositionFormatData {
  direction: 'Long' | 'Short';
  type: 'cross' | 'isolated';
  coin: string;
  size: string;
  positionValue: string;
  leverage: number;
  maxLeverage: number;
  markPx: string;
  entryPx: string;
  liquidationPx: string;
  marginUsed: string;
  unrealizedPnl: string;
  returnOnEquity: string;
  liquidationDistancePercent: string;
  sinceOpenFunding: string;
  tpItem: OpenOrder | undefined;
  slItem: OpenOrder | undefined;
}

export const PositionsInfo: React.FC = () => {
  const {
    // pro no use this
    positionAndOpenOrders,

    clearinghouseState,
    openOrders,

    marketDataMap,
    accountSummary,
    wsActiveAssetCtx,
  } = useRabbySelector((store) => store.perps);
  const dispatch = useRabbyDispatch();
  const { t } = useTranslation();

  const [editMarginVisible, setEditMarginVisible] = useState(false);
  const [editTpSlVisible, setEditTpSlVisible] = useState(false);
  const [closePositionVisible, setClosePositionVisible] = useState(false);
  const [closePositionType, setClosePositionType] = useState<
    'limit' | 'market' | 'reverse'
  >('market');

  const [showLeverageModal, setShowLeverageModal] = React.useState(false);

  const positionFormatData = useMemo(() => {
    const resArr = [] as PositionFormatData[];

    clearinghouseState?.assetPositions.forEach((item) => {
      const isLong = Number(item.position.szi || 0) > 0;
      const marketData = marketDataMap[item.position.coin.toUpperCase()] || {};

      const tpItem = openOrders.find(
        (order) =>
          order.coin === item.position.coin &&
          order.orderType === 'Take Profit Market' &&
          order.isTrigger &&
          order.reduceOnly
      );
      const slItem = openOrders.find(
        (order) =>
          order.coin === item.position.coin &&
          order.orderType === 'Stop Market' &&
          order.isTrigger &&
          order.reduceOnly
      );

      const pxDecimals = marketData.pxDecimals || 2;

      const liquidationDistance = calculateDistanceToLiquidation(
        item.position.liquidationPx,
        marketData.markPx
      );

      resArr.push({
        direction: isLong ? 'Long' : 'Short',
        type: item.position.leverage.type,
        coin: item.position.coin,
        size: isLong ? item.position.szi : item.position.szi.slice(1),
        leverage: item.position.leverage.value,
        maxLeverage: marketData.maxLeverage || 25,
        positionValue: item.position.positionValue,
        markPx: marketData.markPx || '0',
        entryPx: item.position.entryPx || '0',
        liquidationPx:
          Number(item.position.liquidationPx || 0).toFixed(pxDecimals) || '0',
        marginUsed: item.position.marginUsed || '0',
        unrealizedPnl: item.position.unrealizedPnl,
        returnOnEquity: item.position.returnOnEquity,
        liquidationDistancePercent: formatPerpsPct(liquidationDistance),
        sinceOpenFunding: item.position.cumFunding.sinceOpen || '0',
        tpItem: tpItem,
        slItem: slItem,
      });
    });

    return resArr;
  }, [clearinghouseState, openOrders, marketDataMap]);

  const [selectedCoin, setSelectedCoin] = useState<string>('');
  const currentPosition = useMemo(() => {
    return (
      positionFormatData.find((item) => item.coin === selectedCoin) || null
    );
  }, [positionFormatData, selectedCoin]);

  const {
    handleUpdateMargin,
    handleCloseAllPositions,
    handleUpdateMarginModeLeverage,
  } = usePerpsProPosition();

  const { isDarkTheme } = useThemeMode();

  const handleCloseAllPosition = useMemoizedFn(async () => {
    if (!clearinghouseState) {
      return;
    }

    await handleCloseAllPositions(clearinghouseState);
    setTimeout(() => {
      dispatch.perps.fetchClearinghouseState();
    }, 100);
  });

  const handleClickLeverage = useMemoizedFn(
    (coin: string, leverage: number) => {
      setSelectedCoin(coin);
      setShowLeverageModal(true);
    }
  );

  const handleLeverageConfirm = useMemoizedFn(async (newLeverage: number) => {
    const marginMode =
      currentPosition?.type === 'cross'
        ? MarginMode.CROSS
        : MarginMode.ISOLATED;
    await handleUpdateMarginModeLeverage(selectedCoin, newLeverage, marginMode);
    message.success({
      // duration: 1.5,
      content: 'Leverage changed to: ' + newLeverage,
    });
    setShowLeverageModal(false);
    setTimeout(() => {
      dispatch.perps.fetchClearinghouseState();
    }, 100);
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

  const columns = useMemo<ColumnType<PositionFormatData>[]>(
    () => [
      {
        title: t('page.perpsPro.userInfo.tab.coin'),
        width: 120,
        className: 'relative',
        key: 'coin',
        dataIndex: 'coin',
        sorter: (a, b) => a.coin.localeCompare(b.coin),
        render: (_, record) => {
          return (
            <div
              className={clsx(
                'absolute top-0 left-0 right-0 bottom-0',
                'flex flex-col justify-center',
                'pl-[16px] py-[8px]',
                record.direction === 'Long' ? 'is-long-bg' : 'is-short-bg'
              )}
            >
              <div>
                <div
                  className="text-[13px] leading-[16px] font-semibold text-rb-neutral-title-1 mb-[2px] cursor-pointer hover:font-bold hover:text-rb-neutral-body"
                  onClick={() => {
                    dispatch.perps.setSelectedCoin(record.coin);
                  }}
                >
                  {record.coin}
                </div>
                <div className="text-[12px] leading-[14px] font-medium text-rb-neutral-foot">
                  <span
                    className="text-[12px] leading-[14px] font-medium text-rb-neutral-foot hover:font-bold hover:text-rb-neutral-title-1 cursor-pointer"
                    onClick={(e) =>
                      handleClickLeverage(record.coin, record.leverage)
                    }
                  >
                    {record.leverage}x{' '}
                  </span>
                  {record.direction === 'Long' ? 'Long' : 'Short'}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        title: t('page.perpsPro.userInfo.tab.size'),
        width: 160,
        key: 'positionValue',
        dataIndex: 'positionValue',
        sorter: (a, b) => Number(a.positionValue) - Number(b.positionValue),
        render: (_, record) => {
          return (
            <div>
              <div className="text-[12px] leading-[14px] font-medium text-r-neutral-title-1 mb-[4px]">
                {formatUsdValue(record.positionValue || 0)}
              </div>
              <div className="text-[12px] leading-[14px] font-medium text-rb-neutral-foot">
                {Number(record.size)} {record.coin}
              </div>
            </div>
          );
        },
      },
      {
        title: t('page.perpsPro.userInfo.tab.markEntry'),
        key: 'entryPx',
        dataIndex: 'entryPx',
        sorter: (a, b) => Number(a.entryPx) - Number(b.entryPx),
        width: 160,
        render: (_, record) => {
          return (
            <div>
              <div className="text-[12px] leading-[14px] font-medium text-r-neutral-title-1 mb-[4px]">
                ${splitNumberByStep(record.markPx)}
              </div>
              <div className="text-[12px] leading-[14px] font-medium text-rb-neutral-foot">
                ${splitNumberByStep(record.entryPx || 0)}
              </div>
            </div>
          );
        },
      },
      {
        title: t('page.perpsPro.userInfo.tab.unrealizedPnl'),
        key: 'unrealizedPnl',
        dataIndex: 'unrealizedPnl',
        sorter: (a, b) => Number(a.unrealizedPnl) - Number(b.unrealizedPnl),
        width: 160,
        render: (_, record) => {
          const isUp = Number(record.unrealizedPnl) >= 0;
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
                  Math.abs(Number(record.unrealizedPnl)).toFixed(2)
                )}{' '}
              </div>
              <div
                className={clsx(
                  'text-[12px] leading-[14px] font-medium  mb-[4px]',
                  isUp ? 'text-r-green-default' : 'text-r-red-default'
                )}
              >
                {isUp ? '+' : '-'}
                {Math.abs(Number(record.returnOnEquity) * 100).toFixed(2)}%
              </div>
            </div>
          );
        },
      },
      {
        title: t('page.perpsPro.userInfo.tab.liqPrice'),
        width: 160,
        key: 'liquidationPx',
        dataIndex: 'liquidationPx',
        sorter: (a, b) => Number(a.liquidationPx) - Number(b.liquidationPx),
        render: (_, record) => {
          return (
            <div className="flex items-center gap-[4px]">
              <div className="text-[12px] leading-[14px] font-medium text-r-neutral-title-1">
                ${splitNumberByStep(record.liquidationPx)}
              </div>
              <DistanceRiskTag
                isLong={record.direction === 'Long'}
                percent={record.liquidationDistancePercent}
              />
            </div>
          );
        },
      },
      {
        title: t('page.perpsPro.userInfo.tab.margin'),
        width: 160,
        key: 'marginUsed',
        dataIndex: 'marginUsed',
        sorter: (a, b) => Number(a.marginUsed) - Number(b.marginUsed),
        render: (_, record) => {
          return (
            <div className="flex items-center gap-[12px]">
              <div>
                <div className="text-[12px] leading-[14px] font-medium text-r-neutral-title-1 mb-[4px]">
                  {formatUsdValue(Number(record.marginUsed || 0))}
                </div>
                <div className="text-[12px] leading-[14px] font-medium text-rb-neutral-foot">
                  {record.type === 'cross' ? 'Cross' : 'Isolated'}
                </div>
              </div>
              <RcIconEditCC
                className="text-rb-neutral-foot cursor-pointer hover:text-r-blue-default"
                onClick={() => {
                  setSelectedCoin(record.coin);
                  setEditMarginVisible(true);
                }}
              />
            </div>
          );
        },
      },
      {
        title: t('page.perpsPro.userInfo.tab.funding'),
        width: 160,
        key: 'fundingPayments',
        dataIndex: 'fundingPayments',
        sorter: (a, b) =>
          Number(a.sinceOpenFunding) - Number(b.sinceOpenFunding),
        render: (_, record) => {
          return (
            <div className="text-[12px] leading-[14px] font-medium text-rb-neutral-foot">
              {Number(record.sinceOpenFunding || 0) === 0
                ? ''
                : Number(record.sinceOpenFunding || 0) > 0
                ? '+'
                : '-'}
              ${Math.abs(Number(record.sinceOpenFunding || 0))}
            </div>
          );
        },
      },
      {
        title: t('page.perpsPro.userInfo.tab.tpSl'),
        width: 160,
        key: 'children',
        dataIndex: 'children',
        render: (_, record) => {
          const tpPrice = record.tpItem?.triggerPx;
          const slPrice = record.slItem?.triggerPx;

          const entryPrice = Number(record.entryPx);
          const size = Math.abs(Number(record.size || 0));

          const isLong = record.direction === 'Long';
          // Calculate expected PNL for take profit
          const takeProfitExpectedPnl = calculatePnL(
            Number(tpPrice || 0),
            isLong ? 'Long' : 'Short',
            size,
            entryPrice
          );

          // Calculate expected PNL for stop loss
          const stopLossExpectedPnl = calculatePnL(
            Number(slPrice || 0),
            isLong ? 'Long' : 'Short',
            size,
            entryPrice
          );

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
                  setSelectedCoin(record.coin);
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
            className="text-rb-neutral-foot cursor-pointer underline"
            onClick={handleClickCloseAll}
          >
            {t('page.perpsPro.userInfo.positionInfo.closeAll')}
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
                    setSelectedCoin(record.coin);
                    setClosePositionType(
                      info.key as 'limit' | 'market' | 'reverse'
                    );
                    setClosePositionVisible(true);
                  }}
                >
                  <Menu.Item key="reverse">
                    {t('page.perpsPro.userInfo.positionInfo.reverse')}
                  </Menu.Item>
                  <Menu.Item key="limit">
                    {t('page.perpsPro.userInfo.positionInfo.closeLimit')}
                  </Menu.Item>
                  <Menu.Item key="market">
                    {t('page.perpsPro.userInfo.positionInfo.closeMarket')}
                  </Menu.Item>
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
                {t('page.perpsPro.userInfo.positionInfo.close')}
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
        dataSource={positionFormatData}
        columns={columns}
        pagination={false}
        bordered={false}
        showSorterTooltip={false}
        rowKey="coin"
      ></CommonTable>
      {currentPosition && (
        <>
          <EditMarginModal
            visible={editMarginVisible}
            coin={currentPosition?.coin || ''}
            currentAssetCtx={
              marketDataMap[currentPosition.coin.toUpperCase()] || {}
            }
            direction={currentPosition.direction}
            entryPrice={Number(currentPosition.entryPx || 0)}
            leverage={currentPosition.leverage}
            availableBalance={Number(accountSummary?.withdrawable || 0)}
            liquidationPx={Number(currentPosition?.liquidationPx || 0)}
            positionSize={Number(currentPosition.size || 0)}
            marginUsed={Number(currentPosition.marginUsed || 0)}
            pnl={Number(currentPosition.unrealizedPnl || 0)}
            onCancel={() => setEditMarginVisible(false)}
            onConfirm={async (action: 'add' | 'reduce', margin: number) => {
              await handleUpdateMargin(currentPosition.coin, action, margin);
              setEditMarginVisible(false);
            }}
          />
          <EditTpSlModal
            position={currentPosition}
            marketData={marketDataMap[currentPosition.coin.toUpperCase()] || {}}
            visible={editTpSlVisible}
            onCancel={() => setEditTpSlVisible(false)}
            onConfirm={() => setEditTpSlVisible(false)}
          />
          <ClosePositionModal
            type={closePositionType}
            position={currentPosition}
            marketData={marketDataMap[currentPosition.coin.toUpperCase()] || {}}
            visible={closePositionVisible}
            onCancel={() => setClosePositionVisible(false)}
            onConfirm={() => {
              setClosePositionVisible(false);
            }}
          />
          {/* Leverage Modal */}
          <LeverageModal
            visible={showLeverageModal}
            currentLeverage={currentPosition?.leverage || 1}
            maxLeverage={currentPosition?.maxLeverage || 25}
            coinSymbol={currentPosition?.coin || ''}
            onConfirm={handleLeverageConfirm}
            onCancel={() => setShowLeverageModal(false)}
          />
        </>
      )}
    </>
  );
};
