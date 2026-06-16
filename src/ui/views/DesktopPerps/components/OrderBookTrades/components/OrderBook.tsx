import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import { createPortal } from 'react-dom';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { getPerpsSDK, getBboSDK } from '@/ui/views/Perps/sdkManager';
import { splitNumberByStep } from '@/ui/utils';
import { Dropdown, Menu, Select, Skeleton } from 'antd';
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
import { formatPerpsCoin } from '../../../utils';
// View modes
type ViewMode = 'Both' | 'Bids' | 'Asks';

// Aggregation level config
interface AggregationConfig {
  nSigFigs?: number;
  mantissa?: number | null;
  label: string;
}

interface OrderBookLevel {
  price: string;
  size: number;
  usdSize: number;
  total: number;
  totalUsd: number;
}

interface OrderBookTooltipState {
  type: 'bid' | 'ask';
  index: number;
  top: number;
  left: number;
  alignLeft: boolean;
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
    marketEstSize,
    quoteUnit,
  } = useRabbySelector((state) => state.perps);
  const dispatch = useRabbyDispatch();
  const [viewMode, setViewMode] = useState<ViewMode>('Both');
  const [aggregationIndex, setAggregationIndex] = useState<number>(0);
  const [bids, setBids] = useState<OrderBookLevel[]>([]);
  const [asks, setAsks] = useState<OrderBookLevel[]>([]);
  const [
    hoveredOrder,
    setHoveredOrder,
  ] = useState<OrderBookTooltipState | null>(null);

  // Dynamic row count based on container height
  const ORDER_ROW_HEIGHT = 24;
  const MIDDLE_PRICE_HEIGHT = 40;
  const contentRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(0);
  useEffect(() => {
    if (!contentRef.current) return;
    const observer = new ResizeObserver((entries: ResizeObserverEntry[]) => {
      const entry = entries[0];
      if (!entry) return;
      setContainerHeight(entry.contentRect.height);
    });
    observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, []);

  const rowCount = useMemo(() => {
    if (!containerHeight) return 11;
    if (viewMode === 'Both') {
      const availableForRows = containerHeight - MIDDLE_PRICE_HEIGHT;
      const totalRows = Math.floor(availableForRows / ORDER_ROW_HEIGHT);
      return Math.max(1, Math.floor(totalRows / 2));
    }
    // Asks-only or Bids-only: all space for one side, no middle price row
    const totalRows = Math.floor(containerHeight / ORDER_ROW_HEIGHT);
    return Math.max(1, totalRows);
  }, [containerHeight, viewMode]);
  const currentMarketData = useMemo(() => {
    if (wsActiveAssetCtx && wsActiveAssetCtx.coin === selectedCoin) {
      return wsActiveAssetCtx.ctx;
    }

    return marketDataMap[selectedCoin];
  }, [marketDataMap, selectedCoin, wsActiveAssetCtx]);

  const szDecimals = useMemo(() => {
    return marketDataMap[selectedCoin]?.szDecimals ?? 5;
  }, [currentMarketData, selectedCoin]);

  const quoteAsset = marketDataMap[selectedCoin]?.quoteAsset ?? 'USDC';
  const pxDecimals = marketDataMap[selectedCoin]?.pxDecimals ?? 2;

  const markPx = useMemo(() => {
    if (wsActiveAssetCtx && wsActiveAssetCtx.coin === selectedCoin) {
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

  useEffect(() => {
    setAggregationIndex(0);
    setHoveredOrder(null);
  }, [selectedCoin]);

  const selectedAggregation = useMemo(() => {
    return aggregationLevels[aggregationIndex] || aggregationLevels[0];
  }, [aggregationIndex, aggregationLevels]);

  // Extract BBO prices from raw L2 book levels
  const updateBboPrices = useCallback(
    (
      levels: [
        { px: string; sz: string; n: number }[],
        { px: string; sz: string; n: number }[]
      ]
    ) => {
      const rawBids = levels[0] || [];
      const rawAsks = levels[1] || [];
      dispatch.perps.patchState({
        bboPrices: {
          asks1: rawAsks[0]?.px || '',
          asks5: rawAsks[4]?.px || '',
          bids1: rawBids[0]?.px || '',
          bids5: rawBids[4]?.px || '',
        },
      });
    },
    []
  );

  // Subscribe to order book data via WebSocket
  useEffect(() => {
    if (!selectedCoin) return;

    const sdk = getPerpsSDK();
    const currentAggregation = aggregationLevels[aggregationIndex];
    const isDefaultAgg = aggregationIndex === 0;

    // Main subscription: display data at current aggregation level
    const { unsubscribe } = sdk.ws.subscribeToL2Book(
      {
        coin: selectedCoin,
        nSigFigs: currentAggregation?.nSigFigs || 5,
        mantissa: currentAggregation?.mantissa || undefined,
      },
      (data) => {
        if (!data?.levels) return;

        const processedBids: OrderBookLevel[] = [];
        let totalBids = 0;
        let totalBidsUsd = 0;
        for (const level of data.levels[0] || []) {
          const price = level.px;
          const size = Number(level.sz);
          const usdSize = Number(price) * size;
          totalBids += size;
          totalBidsUsd += usdSize;
          processedBids.push({
            price,
            size,
            usdSize,
            total: totalBids,
            totalUsd: totalBidsUsd,
          });
        }

        const processedAsks: OrderBookLevel[] = [];
        let totalAsks = 0;
        let totalAsksUsd = 0;
        for (const level of data.levels[1] || []) {
          const price = level.px;
          const size = Number(level.sz);
          const usdSize = Number(price) * size;
          totalAsks += size;
          totalAsksUsd += usdSize;
          processedAsks.push({
            price,
            size,
            usdSize,
            total: totalAsks,
            totalUsd: totalAsksUsd,
          });
        }

        setBids(processedBids);
        setAsks(processedAsks);

        // Default aggregation: also extract BBO prices
        if (isDefaultAgg) {
          updateBboPrices(data.levels);
        }
      }
    );

    // Non-default aggregation: use separate SDK instance for BBO
    // Separate WS connection avoids message routing conflicts
    let unsubscribeBbo: (() => void) | undefined;
    if (!isDefaultAgg && aggregationLevels[0]) {
      const bboSdk = getBboSDK();
      const defaultAgg = aggregationLevels[0];
      const sub = bboSdk.ws.subscribeToL2Book(
        {
          coin: selectedCoin,
          nSigFigs: defaultAgg.nSigFigs || 5,
          mantissa: defaultAgg.mantissa || undefined,
        },
        (data) => {
          if (data?.levels) {
            updateBboPrices(data.levels);
          }
        }
      );
      unsubscribeBbo = sub.unsubscribe;
    }

    return () => {
      unsubscribe();
      unsubscribeBbo?.();
    };
  }, [selectedCoin, aggregationIndex, aggregationLevels]);

  const formatLevelValue = useCallback(
    (baseValue: number, usdValue: number) => {
      if (quoteUnit === 'usd') {
        return splitNumberByStep(usdValue.toFixed(0));
      }
      return splitNumberByStep(baseValue.toFixed(szDecimals));
    },
    [quoteUnit, szDecimals]
  );

  const handleClickPrice = useCallback((price: number) => {
    eventBus.emit(EVENTS.PERPS.HANDLE_CLICK_PRICE, price.toString());
  }, []);

  const updateTooltipPosition = useCallback(
    (type: 'bid' | 'ask', index: number, rowElement: HTMLDivElement | null) => {
      if (!rowElement || !contentRef.current) return;

      const rowRect = rowElement.getBoundingClientRect();
      const containerRect = contentRef.current.getBoundingClientRect();
      const hasRoomOnLeft = containerRect.left >= 190;
      const viewportHeight =
        window.innerHeight || document.documentElement.clientHeight;
      const centerTop = rowRect.top + rowRect.height / 2;

      setHoveredOrder({
        type,
        index,
        top: Math.min(
          Math.max(centerTop, 44),
          Math.max(44, viewportHeight - 44)
        ),
        left: hasRoomOnLeft
          ? containerRect.left - 10
          : containerRect.left + containerRect.width + 10,
        alignLeft: hasRoomOnLeft,
      });
    },
    []
  );

  const getIsInHoverRange = useCallback(
    (type: 'bid' | 'ask', index: number) => {
      if (!hoveredOrder || hoveredOrder.type !== type) return false;
      return type === 'bid'
        ? index <= hoveredOrder.index
        : index >= hoveredOrder.index;
    },
    [hoveredOrder]
  );

  const buildOrderTooltip = useCallback(
    (orders: OrderBookLevel[], hoverIndex: number) => {
      const order = orders[hoverIndex];
      if (!order || !order.total || !order.totalUsd) return null;

      const sumSize = order.total;
      const sumUsd = order.totalUsd;
      const avgPrice = sumSize ? sumUsd / sumSize : 0;
      if (!avgPrice) return null;

      return (
        <div className="desktop-perps-orderbook-tooltip-content">
          <div className="desktop-perps-orderbook-tooltip-row">
            <span>{t('page.perpsPro.orderBook.avgPrice')}</span>
            <span>{splitNumberByStep(avgPrice.toFixed(pxDecimals))}</span>
          </div>
          <div className="desktop-perps-orderbook-tooltip-row">
            <span>
              {t('page.perpsPro.orderBook.sumBase', {
                base: formatPerpsCoin(
                  marketDataMap[selectedCoin]?.displayName || selectedCoin
                ),
              })}
            </span>
            <span>{splitNumberByStep(sumSize.toFixed(szDecimals))}</span>
          </div>
          <div className="desktop-perps-orderbook-tooltip-row">
            <span>{t('page.perpsPro.orderBook.sumUsd')}</span>
            <span>{splitNumberByStep(sumUsd.toFixed(2))}</span>
          </div>
        </div>
      );
    },
    [marketDataMap, pxDecimals, selectedCoin, szDecimals, t]
  );

  const renderOrderRow = (
    order: OrderBookLevel,
    type: 'bid' | 'ask',
    maxTotal: number,
    index: number
  ) => {
    const depthPercent = maxTotal > 0 ? (order.total / maxTotal) * 100 : 0;
    const isInHoverRange = getIsInHoverRange(type, index);
    const isHoveredRow =
      hoveredOrder?.type === type && hoveredOrder.index === index;
    const shouldFillNextGap =
      isInHoverRange && getIsInHoverRange(type, index + 1);
    return (
      <div
        key={`${type}-${order.price}`}
        onMouseEnter={(e) =>
          updateTooltipPosition(type, index, e.currentTarget)
        }
        onMouseMove={(e) => updateTooltipPosition(type, index, e.currentTarget)}
        onClick={() => handleClickPrice(Number(order.price))}
        className={clsx(
          'desktop-perps-orderbook-row relative flex items-center justify-between px-[12px] h-[24px] text-[12px] cursor-pointer group',
          `desktop-perps-orderbook-row-${type}`,
          isInHoverRange && 'is-hover-range',
          isHoveredRow && 'is-hovered-row',
          shouldFillNextGap && 'is-hover-gap-fill'
        )}
      >
        {/* Depth background */}
        <div
          className={clsx(
            'absolute top-0 bottom-0 transition-[width] duration-200 ease-out',
            type === 'bid' ? 'left-0' : 'right-0',
            type === 'bid' ? 'bg-rb-green-light-1' : 'bg-rb-red-light-1'
          )}
          style={{ width: `${depthPercent}%` }}
        />

        <div className="relative z-10 grid grid-cols-10 items-center justify-between w-full">
          <span
            className={clsx(
              'col-span-3 text-left group-hover:font-bold',
              type === 'bid' ? 'text-rb-green-default' : 'text-r-red-default'
            )}
          >
            {splitNumberByStep(order.price)}
          </span>
          <span className="text-rb-neutral-title-1 col-span-3 text-right">
            {formatLevelValue(order.size, order.usdSize)}
          </span>
          <span className="text-rb-neutral-title-1 col-span-4 text-right">
            {formatLevelValue(order.total, order.totalUsd)}
          </span>
        </div>
      </div>
    );
  };

  const { displayAsks, displayBids } = useMemo(() => {
    if (viewMode === 'Both') {
      return {
        displayAsks: asks.slice(0, rowCount).reverse(),
        displayBids: bids.slice(0, rowCount),
      };
    } else if (viewMode === 'Asks') {
      return {
        displayAsks: asks.slice(0, rowCount).reverse(),
        displayBids: [],
      };
    } else {
      return {
        displayAsks: [],
        displayBids: bids.slice(0, rowCount),
      };
    }
  }, [viewMode, asks, bids, rowCount]);

  // useEffect(() => {
  //   if (!marketEstSize) return;
  //   let estPrice = '';
  //   const isBuy = Number(marketEstSize) > 0;
  //   const arr = isBuy ? bids : asks;
  //   for (const item of arr) {
  //     if (item.total >= Math.abs(Number(marketEstSize))) {
  //       estPrice = item.price;
  //       break;
  //     }
  //   }
  //   if (!estPrice) {
  //     estPrice = arr[arr.length - 1]?.price || '';
  //   }
  //   dispatch.perps.patchState({
  //     marketEstPrice: estPrice,
  //   });
  // }, [marketEstSize, asks, bids]);

  const maxTotal = useMemo(() => {
    const bid =
      displayBids.length > 0 ? Math.max(...displayBids.map((b) => b.total)) : 0;
    const ask =
      displayAsks.length > 0 ? Math.max(...displayAsks.map((a) => a.total)) : 0;
    return Math.max(bid, ask);
  }, [displayBids, displayAsks]);

  const isLoading = bids.length === 0 && asks.length === 0;

  const hoveredOrders =
    hoveredOrder?.type === 'ask' ? displayAsks : displayBids;
  const tooltipContent =
    hoveredOrder && hoveredOrders[hoveredOrder.index]
      ? buildOrderTooltip(hoveredOrders, hoveredOrder.index)
      : null;

  const tooltipOverlay =
    hoveredOrder && tooltipContent && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="desktop-perps-orderbook-tooltip-overlay"
            style={{
              left: hoveredOrder.left,
              top: hoveredOrder.top,
              transform: hoveredOrder.alignLeft
                ? 'translate(-100%, -50%)'
                : 'translate(0, -50%)',
            }}
          >
            {tooltipContent}
          </div>,
          document.body
        )
      : null;

  const priceChange = currentMarketData?.prevDayPx
    ? Number(currentMarketData.markPx) - Number(currentMarketData.prevDayPx)
    : 0;

  const renderSkeletonRows = (count: number) => {
    return new Array(count).fill(null).map((_, index) => (
      <div
        key={index}
        className="flex items-center justify-between px-[12px] h-[24px]"
      >
        <div className="grid grid-cols-10 items-center w-full">
          <span className="col-span-3">
            <Skeleton.Button
              active
              className="h-[14px] block rounded-[4px]"
              style={{ width: 60, minWidth: 60 }}
            />
          </span>
          <span className="col-span-3 flex justify-end">
            <Skeleton.Button
              active
              className="h-[14px] block rounded-[4px]"
              style={{ width: 50, minWidth: 50 }}
            />
          </span>
          <span className="col-span-4 flex justify-end">
            <Skeleton.Button
              active
              className="h-[14px] block rounded-[4px]"
              style={{ width: 60, minWidth: 60 }}
            />
          </span>
        </div>
      </div>
    ));
  };

  return (
    <div className="h-full flex flex-col bg-rb-neutral-bg-1 whitespace-nowrap">
      {/* Control Bar */}
      <div className="flex items-center justify-between px-[12px] py-[6px] shrink-0">
        {/* View Mode Switcher */}
        <div className="flex items-center gap-[8px]">
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
            transitionName=""
            forceRender={true}
            overlay={
              <Menu
                className="bg-r-neutral-bg1"
                onClick={(info) =>
                  dispatch.perps.updateQuoteUnit(info.key as 'base' | 'usd')
                }
              >
                <Menu.Item
                  className="text-r-neutral-title1 hover:bg-r-blue-light1"
                  key="base"
                >
                  {formatPerpsCoin(selectedCoin)}
                </Menu.Item>
                <Menu.Item
                  className="text-r-neutral-title1 hover:bg-r-blue-light1"
                  key="usd"
                >
                  {quoteAsset}
                </Menu.Item>
              </Menu>
            }
          >
            <button
              type="button"
              className={clsx(
                'inline-flex items-center justify-between',
                'px-[8px] py-[8px] flex-1 gap-[6px] h-24',
                'border border-rb-neutral-line rounded-[6px]',
                'hover:border-rb-brand-default border border-solid border-transparent',
                'text-[12px] leading-[14px] font-medium text-rb-neutral-title-1'
              )}
            >
              {quoteUnit === 'base'
                ? formatPerpsCoin(selectedCoin)
                : quoteAsset}
              <RcIconArrowDownPerpsCC className="text-rb-neutral-secondary" />
            </button>
          </Dropdown>
          <Dropdown
            forceRender={true}
            transitionName=""
            overlay={
              <Menu
                className="bg-r-neutral-bg1"
                onClick={(info) =>
                  setAggregationIndex((info.key as unknown) as number)
                }
              >
                {aggregationLevels.map((level, index) => (
                  <Menu.Item
                    className="text-r-neutral-title1 hover:bg-r-blue-light1"
                    key={index}
                  >
                    {level.label}
                  </Menu.Item>
                ))}
              </Menu>
            }
          >
            <button
              type="button"
              className={clsx(
                'inline-flex items-center justify-between',
                'px-[8px] py-[8px] flex-1 gap-[6px] h-24',
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

      <div className="grid grid-cols-10 px-[12px] py-[5px] text-[11px] text-rb-neutral-secondary shrink-0">
        <span className="col-span-3 text-left">
          {t('page.perpsPro.orderBook.price')}
        </span>
        <span className="col-span-3 text-right">
          {t('page.perpsPro.orderBook.amount')} (
          {quoteUnit === 'base' ? formatPerpsCoin(selectedCoin) : quoteAsset})
        </span>
        <span className="col-span-4 text-right">
          {t('page.perpsPro.orderBook.total')} (
          {quoteUnit === 'base' ? formatPerpsCoin(selectedCoin) : quoteAsset})
        </span>
      </div>

      <div
        ref={contentRef}
        className="flex-1 flex flex-col overflow-hidden"
        onMouseLeave={() => setHoveredOrder(null)}
      >
        {isLoading ? (
          <>
            <div className="flex-1 flex flex-col gap-2 justify-end">
              {renderSkeletonRows(rowCount)}
            </div>
            <div className="flex items-center px-[12px] h-40">
              <Skeleton.Button
                active
                className="h-[20px] block rounded-[4px]"
                style={{ width: 100, minWidth: 100 }}
              />
            </div>
            <div className="flex-1 flex flex-col gap-2">
              {renderSkeletonRows(rowCount)}
            </div>
          </>
        ) : (
          <>
            {(viewMode === 'Both' || viewMode === 'Asks') && (
              <div
                className={clsx('overflow-hidden gap-2 flex flex-col', {
                  'flex-1': viewMode === 'Both',
                })}
              >
                {displayAsks.map((ask, index) =>
                  renderOrderRow(ask, 'ask', maxTotal, index)
                )}
              </div>
            )}
            {Boolean(latestTrade?.price) && (
              <div className="flex items-center justify-between px-[12px] h-40">
                <div className="flex items-center gap-[6px]">
                  <span
                    className={clsx(
                      'text-[20px] font-medium',
                      latestTrade?.side === 'buy'
                        ? 'text-rb-green-default'
                        : 'text-rb-red-default'
                    )}
                  >
                    {splitNumberByStep(latestTrade?.price || 0)}
                  </span>

                  <span
                    className={clsx('text-[16px] text-rb-neutral-secondary')}
                  >
                    {splitNumberByStep(markPx)}
                  </span>
                </div>
              </div>
            )}
            {(viewMode === 'Both' || viewMode === 'Bids') && (
              <div
                className={clsx('overflow-hidden gap-2 flex flex-col', {
                  'flex-1': viewMode === 'Both',
                })}
              >
                {displayBids.map((bid, index) =>
                  renderOrderRow(bid, 'bid', maxTotal, index)
                )}
              </div>
            )}
          </>
        )}
      </div>
      {tooltipOverlay}
    </div>
  );
};
