import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { getPerpsSDK } from '@/ui/views/Perps/sdkManager';
import { splitNumberByStep } from '@/ui/utils';
import { Dropdown, Menu, Select } from 'antd';
import { ReactComponent as RcIconBuySell } from '@/ui/assets/perps/icon-buy-sell.svg';
import { ReactComponent as RcIconBuy } from '@/ui/assets/perps/icon-buy.svg';
import { ReactComponent as RcIconSell } from '@/ui/assets/perps/icon-sell.svg';
import eventBus from '@/eventBus';
import { EVENTS } from '@/constant';
import {
  RcIconArrowDownCC,
  RcIconArrowDownPerpsCC,
} from '@/ui/assets/desktop/common';
import { Trade } from '..';
import { getPerpTickOptions } from '../../../utils';
// View modes
type ViewMode = 'Both' | 'Bids' | 'Asks';

// Quote unit
type QuoteUnit = 'base' | 'usd';

// Aggregation level config
interface AggregationConfig {
  nSigFigs?: number;
  mantissa?: number | null;
  label: string;
}

interface OrderBookLevel {
  price: number;
  size: number;
  total: number;
}

export const OrderBook: React.FC<{ latestTrade?: Trade }> = ({
  latestTrade,
}) => {
  const { t } = useTranslation();
  const {
    selectedCoin,
    marketDataMap,
    wsActiveAssetCtx,
    isInitialized,
  } = useRabbySelector((state) => state.perps);
  const dispatch = useRabbyDispatch();
  const [viewMode, setViewMode] = useState<ViewMode>('Both');
  const [quoteUnit, setQuoteUnit] = useState<QuoteUnit>('base');
  const [aggregationIndex, setAggregationIndex] = useState<number>(0);
  const [bids, setBids] = useState<OrderBookLevel[]>([]);
  const [asks, setAsks] = useState<OrderBookLevel[]>([]);
  const currentMarketData = useMemo(() => {
    if (
      wsActiveAssetCtx &&
      wsActiveAssetCtx.coin.toUpperCase() === selectedCoin.toUpperCase()
    ) {
      return wsActiveAssetCtx.ctx;
    }

    return marketDataMap[selectedCoin.toUpperCase()];
  }, [marketDataMap, selectedCoin, wsActiveAssetCtx]);

  const szDecimals = useMemo(() => {
    return marketDataMap[selectedCoin.toUpperCase()]?.szDecimals ?? 5;
  }, [currentMarketData, selectedCoin]);

  const markPx = useMemo(() => {
    if (
      wsActiveAssetCtx &&
      wsActiveAssetCtx.coin.toUpperCase() === selectedCoin.toUpperCase()
    ) {
      return Number(wsActiveAssetCtx.ctx.markPx || 0);
    }

    return Number(currentMarketData?.markPx || 0);
  }, [wsActiveAssetCtx, currentMarketData, selectedCoin]);

  // Six aggregation levels: from finest to coarsest
  // Based on szDecimals to determine appropriate tick size
  // For BTC (szDecimals=5): baseTickSize = 1 → 1, 2, 5, 10, 100, 1000
  // For ETH (szDecimals=4): baseTickSize = 0.1 → 0.1, 0.2, 0.5, 1, 10, 100
  // For SOL (szDecimals=2): baseTickSize = 0.01 → 0.01, 0.02, 0.05, 0.1, 1, 10
  const aggregationLevels = useMemo<AggregationConfig[]>(() => {
    if (!markPx || !isInitialized) return [];
    const result = getPerpTickOptions(markPx, szDecimals);

    return result.map((level) => {
      return {
        nSigFigs: level.nSigFigs,
        mantissa: level.mantissa,
        label: level.displayPrice.toString(),
      };
    });
  }, [szDecimals, selectedCoin, isInitialized]);

  const selectedAggregation = useMemo(() => {
    return aggregationLevels[aggregationIndex] || aggregationLevels[0];
  }, [aggregationIndex, aggregationLevels]);

  // Subscribe to order book data via WebSocket
  useEffect(() => {
    if (!selectedCoin) return;

    const sdk = getPerpsSDK();
    const currentAggregation = aggregationLevels[aggregationIndex];

    // Subscribe to L2 book updates with specified aggregation
    const { unsubscribe } = sdk.ws.subscribeToL2Book(
      {
        coin: selectedCoin,
        nSigFigs: currentAggregation?.nSigFigs || 5,
        mantissa: currentAggregation?.mantissa || undefined,
      },
      (data) => {
        if (data && data.levels) {
          // Process bids (buy orders) - sorted descending by price (high to low)
          const processedBids: OrderBookLevel[] = [];
          let totalBids = 0;
          for (const level of data.levels[0] || []) {
            const price = Number(level.px);
            const size = Number(level.sz);
            totalBids += size;
            processedBids.push({
              price,
              size,
              total: totalBids,
            });
          }

          // Process asks (sell orders) - sorted ascending by price (low to high)
          const processedAsks: OrderBookLevel[] = [];
          let totalAsks = 0;
          for (const level of data.levels[1] || []) {
            const price = Number(level.px);
            const size = Number(level.sz);
            totalAsks += size;
            processedAsks.push({
              price,
              size,
              total: totalAsks,
            });
          }

          setBids(processedBids);
          setAsks(processedAsks);
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [selectedCoin, aggregationIndex, aggregationLevels]);

  const formatValue = useCallback(
    (value: number) => {
      if (quoteUnit === 'usd' && currentMarketData) {
        return splitNumberByStep(
          (value * Number(currentMarketData.markPx)).toFixed(0)
        );
      }
      return splitNumberByStep(value.toFixed(szDecimals));
    },
    [quoteUnit, currentMarketData, szDecimals]
  );

  const handleClickPrice = useCallback((price: number) => {
    eventBus.emit(EVENTS.PERPS.HANDLE_CLICK_PRICE, price.toString());
  }, []);

  const renderOrderRow = (
    order: OrderBookLevel,
    type: 'bid' | 'ask',
    maxTotal: number
  ) => {
    const depthPercent = maxTotal > 0 ? (order.total / maxTotal) * 100 : 0;

    return (
      <div
        key={`${type}-${order.price}`}
        onClick={() => handleClickPrice(order.price)}
        className="relative flex items-center justify-between px-[12px] h-[24px] text-[12px] hover:bg-rb-neutral-bg-0 cursor-pointer group"
      >
        {/* Depth background */}
        <div
          className={clsx(
            'absolute left-0 top-0 bottom-0 transition-[width] duration-200 ease-out',
            type === 'bid' ? 'bg-rb-green-light-1' : 'bg-rb-red-light-1'
          )}
          style={{ width: `${depthPercent}%` }}
        />

        <div className="relative z-10 flex items-center justify-between w-full">
          <span
            className={clsx(
              'font-medium min-w-[80px] text-left group-hover:font-bold',
              type === 'bid' ? 'text-rb-green-default' : 'text-rb-red-default'
            )}
          >
            {splitNumberByStep(order.price)}
          </span>
          <span className="text-r-neutral-title-1 font-medium min-w-[80px] text-right">
            {formatValue(order.size)}
          </span>
          <span className="text-r-neutral-title-1 font-medium min-w-[80px] text-right">
            {formatValue(order.total)}
          </span>
        </div>
      </div>
    );
  };

  const { displayAsks, displayBids } = useMemo(() => {
    if (viewMode === 'Both') {
      return {
        displayAsks: asks.slice(0, 11).reverse(),
        displayBids: bids.slice(0, 11),
      };
    } else if (viewMode === 'Asks') {
      return {
        displayAsks: asks.reverse(),
        displayBids: [],
      };
    } else {
      return {
        displayAsks: [],
        displayBids: bids,
      };
    }
  }, [viewMode, asks, bids]);

  const maxTotal = useMemo(() => {
    const bid =
      displayBids.length > 0 ? Math.max(...displayBids.map((b) => b.total)) : 0;
    const ask =
      displayAsks.length > 0 ? Math.max(...displayAsks.map((a) => a.total)) : 0;
    return Math.max(bid, ask);
  }, [displayBids, displayAsks]);

  const priceChange = currentMarketData?.prevDayPx
    ? Number(currentMarketData.markPx) - Number(currentMarketData.prevDayPx)
    : 0;
  const priceChangePercent = currentMarketData?.prevDayPx
    ? (priceChange / Number(currentMarketData.prevDayPx)) * 100
    : 0;
  const isPositive = priceChange >= 0;

  return (
    <div className="h-full flex flex-col bg-rb-neutral-bg-1">
      {/* Control Bar */}
      <div className="flex items-center justify-between px-[12px] py-[6px] flex-shrink-0">
        {/* View Mode Switcher */}
        <div className="flex items-center gap-[12px]">
          <button
            className={clsx(
              'opacity-50',
              viewMode === 'Both'
                ? 'opacity-100'
                : 'text-r-neutral-foot hover:opacity-100'
            )}
            onClick={() => setViewMode('Both')}
            title={t('page.perpsPro.orderBook.viewBoth')}
          >
            <RcIconBuySell className="w-[24px] h-[24px]" />
          </button>
          <button
            className={clsx(
              'opacity-50',
              viewMode === 'Bids'
                ? 'opacity-100'
                : 'text-r-neutral-foot hover:opacity-100'
            )}
            onClick={() => setViewMode('Bids')}
            title={t('page.perpsPro.orderBook.viewBids')}
          >
            <RcIconBuy className="w-[24px] h-[24px]" />
          </button>
          <button
            className={clsx(
              'opacity-50',
              viewMode === 'Asks'
                ? 'opacity-100'
                : 'text-r-neutral-foot hover:opacity-100'
            )}
            onClick={() => setViewMode('Asks')}
            title={t('page.perpsPro.orderBook.viewAsks')}
          >
            <RcIconSell className="w-[24px] h-[24px]" />
          </button>
        </div>

        <div className="flex items-center gap-12">
          <Dropdown
            overlay={
              <Menu onClick={(info) => setQuoteUnit(info.key as QuoteUnit)}>
                <Menu.Item key="base">{selectedCoin}</Menu.Item>
                <Menu.Item key="usd">USD</Menu.Item>
              </Menu>
            }
          >
            <button
              type="button"
              className={clsx(
                'inline-flex items-center justify-between',
                'px-[8px] py-[8px] flex-1 min-w-[80px] h-24',
                'border border-rb-neutral-line rounded-[6px]',
                'hover:border-rb-brand-default border border-solid border-transparent',
                'text-[12px] leading-[14px] font-medium text-rb-neutral-title-1'
              )}
            >
              {selectedCoin}
              <RcIconArrowDownPerpsCC className="text-rb-neutral-secondary" />
            </button>
          </Dropdown>
          <Dropdown
            overlay={
              <Menu onClick={(info) => setAggregationIndex(info.key as number)}>
                {aggregationLevels.map((level, index) => (
                  <Menu.Item key={index}>{level.label}</Menu.Item>
                ))}
              </Menu>
            }
          >
            <button
              type="button"
              className={clsx(
                'inline-flex items-center justify-between',
                'px-[8px] py-[8px] flex-1 min-w-[80px] h-24',
                'border border-rb-neutral-line rounded-[6px]',
                'hover:border-rb-brand-default border border-solid border-transparent',
                'text-[12px] leading-[14px] font-medium text-rb-neutral-title-1'
              )}
            >
              {selectedAggregation?.label || ''}
              <RcIconArrowDownPerpsCC className="text-rb-neutral-secondary" />
            </button>
          </Dropdown>
        </div>
      </div>

      <div className="flex items-center justify-between px-[8px] py-[5px] text-[11px] text-r-neutral-foot flex-shrink-0">
        <span className="min-w-[80px] text-left">
          {t('page.perpsPro.orderBook.price')}
        </span>
        <span className="min-w-[80px] text-right">
          {t('page.perpsPro.orderBook.amount')} (
          {quoteUnit === 'base' ? selectedCoin : 'USD'})
        </span>
        <span className="min-w-[80px] text-right">
          {t('page.perpsPro.orderBook.total')} (
          {quoteUnit === 'base' ? selectedCoin : 'USD'})
        </span>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {(viewMode === 'Both' || viewMode === 'Asks') && (
          <div
            className={clsx('overflow-y-auto gap-2 flex flex-col', {
              'flex-1': viewMode === 'Both',
            })}
          >
            {displayAsks.map((ask) => renderOrderRow(ask, 'ask', maxTotal))}
          </div>
        )}
        {Boolean(latestTrade?.price) && (
          <div className="flex items-center justify-between px-[12px] h-40">
            <div className="flex items-center gap-[6px]">
              <span
                className={clsx(
                  'text-[20px] font-bold',
                  latestTrade?.side === 'buy'
                    ? 'text-rb-green-default'
                    : 'text-rb-red-default'
                )}
              >
                {splitNumberByStep(latestTrade?.price || 0)}
              </span>

              <span
                className={clsx(
                  'text-[16px] text-rb-neutral-secondary font-medium'
                )}
              >
                {splitNumberByStep(markPx)}
              </span>
            </div>
          </div>
        )}
        {(viewMode === 'Both' || viewMode === 'Bids') && (
          <div
            className={clsx('overflow-y-auto gap-2 flex flex-col', {
              'flex-1': viewMode === 'Both',
            })}
          >
            {displayBids.map((bid) => renderOrderRow(bid, 'bid', maxTotal))}
          </div>
        )}
      </div>
    </div>
  );
};
