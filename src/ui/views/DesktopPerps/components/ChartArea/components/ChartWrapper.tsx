import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  CandlestickSeries,
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  UTCTimestamp,
  ColorType,
  IPriceLine,
  CrosshairMode,
  TickMarkType,
  HistogramSeries,
  HistogramData,
} from 'lightweight-charts';
import type { Time } from 'lightweight-charts';
import { useThemeMode } from '@/ui/hooks/usePreference';
import { useRabbySelector } from '@/ui/store';
import { getPerpsSDK } from '@/ui/views/Perps/sdkManager';
import type { Candle, CandleSnapshot } from '@rabby-wallet/hyperliquid-sdk';
import { splitNumberByStep } from '@/ui/utils';
import clsx from 'clsx';
import { useMemoizedFn } from 'ahooks';
import { isScreenSmall } from '../../../utils';

// Type for pending chart data
interface PendingChartData {
  candles: CandlestickData<UTCTimestamp>[];
  volumes: HistogramData<UTCTimestamp>[];
  dataKey: string; // Used to identify which coin/interval this data belongs to
}

interface ChartWrapperProps {
  coin: string;
  interval: string;
}

export interface ChartHoverData {
  time?: string;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
  isPositiveChange?: boolean;
  delta?: number;
  deltaPercent?: number;
  visible: boolean;
}

type IntervalKey =
  | '1m'
  | '5m'
  | '15m'
  | '30m'
  | '1h'
  | '4h'
  | '8h'
  | '12h'
  | '1d'
  | '1w';

// Utility functions
const toUtc = (t: number): UTCTimestamp => Math.floor(t) as UTCTimestamp;

const padZero = (value: number) => String(value).padStart(2, '0');

const timeToDate = (time: Time): Date => {
  if (typeof time === 'number') {
    return new Date(time * 1000);
  }
  if (typeof time === 'string') {
    return new Date(time);
  }
  const { year, month, day } = time;
  return new Date(year, (month || 1) - 1, day || 1);
};

const formatLocalDateTime = (time: Time): string => {
  const date = timeToDate(time);
  const year = date.getFullYear();
  const month = padZero(date.getMonth() + 1);
  const day = padZero(date.getDate());
  const hours = padZero(date.getHours());
  const minutes = padZero(date.getMinutes());
  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

const formatTickLabel = (date: Date, tickMarkType: TickMarkType): string => {
  const year = date.getFullYear();
  const month = padZero(date.getMonth() + 1);
  const day = padZero(date.getDate());
  const hours = padZero(date.getHours());
  const minutes = padZero(date.getMinutes());
  const seconds = padZero(date.getSeconds());

  switch (tickMarkType) {
    case TickMarkType.Year:
      return String(year);
    case TickMarkType.Month:
      return `${year}-${month}`;
    case TickMarkType.DayOfMonth:
      return `${month}-${day}`;
    case TickMarkType.TimeWithSeconds:
      return `${hours}:${minutes}:${seconds}`;
    case TickMarkType.Time:
      return `${hours}:${minutes}`;
    default:
      return `${year}-${month}-${day}`;
  }
};

const createTimeLocalization = () => {
  const formatTick = (time: Time, tickMarkType: TickMarkType): string =>
    formatTickLabel(timeToDate(time), tickMarkType);

  const formatHover = (time: Time): string => formatLocalDateTime(time);

  return {
    locale: 'en-US',
    formatHover,
    formatTick,
  };
};

const parseCandles = (
  data: CandleSnapshot
): CandlestickData<UTCTimestamp>[] => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return [];
  }

  return data.map((row: Candle) => ({
    time: toUtc(Number(row.t) / 1000),
    open: Number(row.o),
    high: Number(row.h),
    low: Number(row.l),
    close: Number(row.c),
  }));
};

const parseVolumes = (data: CandleSnapshot): HistogramData<UTCTimestamp>[] => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return [];
  }

  return data.map((row: Candle) => {
    const volume = Number(row.v || 0);

    return {
      time: toUtc(Number(row.t) / 1000),
      value: volume,
      color: Number(row.c) >= Number(row.o) ? '#0ECB8180' : '#F6465D80',
    };
  });
};

const INTERVAL_OPTIONS: Array<{ label: string; value: IntervalKey }> = [
  { label: '1M', value: '1m' },
  { label: '5M', value: '5m' },
  { label: '15M', value: '15m' },
  { label: '30M', value: '30m' },
  { label: '1H', value: '1h' },
  { label: '4H', value: '4h' },
  { label: '8H', value: '8h' },
  // { label: '12H', value: '12h' },
  { label: '1D', value: '1d' },
  { label: '1W', value: '1w' },
];

const getThemeColors = (isDark: boolean) =>
  isDark
    ? {
        vertLineColor: 'rgba(255, 255, 255, 0.1)',
        horzLineColor: 'rgba(255, 255, 255, 0.1)',
        textColor: 'rgba(247, 250, 252, 1)',
        priceLineColor: 'rgba(255, 255, 255, 1)',
        crosshairVertLineColor: 'rgba(186, 190, 197, 1)',
        bgColor: 'transparent',
        redLineColor: 'rgba(227, 73, 53, 1)',
        timeLabelBackgroundColor: 'rgba(12, 15, 31, 1)',
        greenLineColor: 'rgba(42, 187, 127, 1)',
      }
    : {
        vertLineColor: 'rgba(46, 46, 46, 0.1)',
        horzLineColor: 'rgba(46, 46, 46, 0.1)',
        textColor: 'rgba(25, 41, 69, 1)',
        priceLineColor: 'rgba(12, 15, 31, 1)',
        crosshairVertLineColor: 'rgba(106, 117, 135, 1)',
        redLineColor: 'rgba(227, 73, 53, 1)',
        greenLineColor: 'rgba(42, 187, 127, 1)',
        timeLabelBackgroundColor: 'rgba(255, 255, 255, 1)',
        bgColor: 'transparent',
      };

// Get time range based on interval
const getTimeRange = (interval: string) => {
  const end = Date.now();
  let start = 0;

  switch (interval) {
    case '1m':
      start = end - 1 * 24 * 60 * 60 * 1000; // 1 day
      break;
    case '5m':
      start = end - 1 * 24 * 60 * 60 * 1000; // 1 day
      break;
    case '15m':
      start = end - 7 * 24 * 60 * 60 * 1000; // 1 week
      break;
    case '30m':
      start = end - 7 * 24 * 60 * 60 * 1000; // 1 week
      break;
    case '1h':
      start = end - 1 * 30 * 24 * 60 * 60 * 1000; // 1 month
      break;
    case '4h':
      start = end - 4 * 30 * 24 * 60 * 60 * 1000; // 4 months
      break;
    case '8h':
    case '12h':
      start = end - 8 * 30 * 24 * 60 * 60 * 1000; // 4 months
      break;

    case '1d':
      start = end - 12 * 30 * 24 * 60 * 60 * 1000; // 1 year
      break;
    case '1w':
      start = 0; // All available data
      break;
    default:
      start = end - 7 * 24 * 60 * 60 * 1000; // Default 1 week
  }

  return { start, end };
};

export const ChartWrapper: React.FC<ChartWrapperProps> = ({
  coin,
  interval: propInterval,
}) => {
  const { marketDataMap, clearinghouseState, openOrders } = useRabbySelector(
    (state) => state.perps
  );
  const currentMarketData = useMemo(() => {
    return marketDataMap[coin.toUpperCase()] || {};
  }, [marketDataMap, coin]);
  const pxDecimals = useMemo(() => {
    return currentMarketData.pxDecimals || 2;
  }, [currentMarketData]);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const priceLineRefs = useRef<{
    tp?: IPriceLine;
    sl?: IPriceLine;
    liquidation?: IPriceLine;
    entry?: IPriceLine;
  }>({});
  const isMountedRef = useRef(true);
  const { isDarkTheme } = useThemeMode();
  const lineTagInfo = useMemo(() => {
    const tpPrice = openOrders.find(
      (order) =>
        order.coin === coin &&
        order.orderType === 'Take Profit Market' &&
        order.isTrigger &&
        order.reduceOnly
    )?.triggerPx;
    const slPrice = openOrders.find(
      (order) =>
        order.coin === coin &&
        order.orderType === 'Stop Market' &&
        order.isTrigger &&
        order.reduceOnly
    )?.triggerPx;
    const liquidationPrice = clearinghouseState?.assetPositions.find(
      (item) => item.position.coin === coin
    )?.position.liquidationPx;
    const entryPrice = clearinghouseState?.assetPositions.find(
      (item) => item.position.coin === coin
    )?.position.entryPx;
    return {
      tpPrice: Number(tpPrice || 0),
      slPrice: Number(slPrice || 0),
      liquidationPrice: Number(
        Number(liquidationPrice || 0).toFixed(pxDecimals)
      ),
      entryPrice: Number(entryPrice || 0),
    };
  }, [currentMarketData, pxDecimals, openOrders, clearinghouseState, coin]);

  const [selectedInterval, setSelectedInterval] = useState<string>(
    propInterval || '15m'
  );
  const [chartHoverData, setChartHoverData] = useState<ChartHoverData>({
    visible: false,
  });
  const [latestCandle, setLatestCandle] = useState<ChartHoverData | null>(null);

  const [isChartReady, setIsChartReady] = useState(false);
  const [pendingData, setPendingData] = useState<PendingChartData | null>(null);
  const [isDataApplied, setIsDataApplied] = useState(false);

  // Generate a unique key for the current coin/interval combination
  const dataKey = useMemo(() => `${coin}-${selectedInterval}`, [
    coin,
    selectedInterval,
  ]);

  const colors = useMemo(() => getThemeColors(isDarkTheme), [isDarkTheme]);
  const timeLocalization = useMemo(() => createTimeLocalization(), []);

  // Update price lines function
  const updatePriceLines = useCallback(() => {
    if (!seriesRef.current || !chartRef.current || !lineTagInfo) return;

    // Clear existing price lines
    Object.values(priceLineRefs.current).forEach((line) => {
      if (line) {
        seriesRef.current!.removePriceLine(line);
      }
    });
    priceLineRefs.current = {};

    // Add Take Profit line
    if (lineTagInfo.tpPrice && lineTagInfo.tpPrice > 0) {
      const tpLine = seriesRef.current.createPriceLine({
        price: lineTagInfo.tpPrice,
        color: colors.greenLineColor,
        lineWidth: 1,
        lineStyle: 2, // Dashed
        axisLabelVisible: true,
        title: 'TP',
      });
      priceLineRefs.current.tp = tpLine;
    }

    // Add Entry line
    if (lineTagInfo.entryPrice && lineTagInfo.entryPrice > 0) {
      const entryLine = seriesRef.current.createPriceLine({
        price: lineTagInfo.entryPrice,
        color: colors.greenLineColor,
        lineWidth: 1,
        lineStyle: 2, // Dashed
        axisLabelVisible: true,
        title: 'Entry',
      });
      priceLineRefs.current.entry = entryLine;
    }

    // Add Stop Loss line
    if (lineTagInfo.slPrice && lineTagInfo.slPrice > 0) {
      const slLine = seriesRef.current.createPriceLine({
        price: lineTagInfo.slPrice,
        color: colors.redLineColor,
        lineWidth: 1,
        lineStyle: 2, // Dashed
        axisLabelVisible: true,
        title: 'SL',
      });
      priceLineRefs.current.sl = slLine;
    }

    // Add Liquidation line
    if (lineTagInfo.liquidationPrice && lineTagInfo.liquidationPrice > 0) {
      const liquidationLine = seriesRef.current.createPriceLine({
        price: lineTagInfo.liquidationPrice,
        color: colors.redLineColor,
        lineWidth: 1,
        lineStyle: 2, // Dashed
        axisLabelVisible: true,
        title: 'LIQ',
      });
      priceLineRefs.current.liquidation = liquidationLine;
    }
  }, [
    lineTagInfo.entryPrice,
    lineTagInfo.tpPrice,
    lineTagInfo.slPrice,
    lineTagInfo.liquidationPrice,
    colors,
  ]);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    if (chartRef.current) {
      chartRef.current.remove();
    }

    const getContainerDimensions = () => {
      if (!chartContainerRef.current) {
        return { width: 800, height: 400 }; // Fallback dimensions
      }
      const width = chartContainerRef.current.clientWidth || 800;
      const height = chartContainerRef.current.clientHeight || 400;
      return { width, height };
    };

    const { width, height } = getContainerDimensions();

    const chart = createChart(chartContainerRef.current, {
      width,
      height,
      layout: {
        background: { type: ColorType.Solid, color: colors.bgColor },
        textColor: colors.textColor,
        attributionLogo: true,
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          visible: true,
          color: colors.crosshairVertLineColor,
          labelBackgroundColor: colors.timeLabelBackgroundColor,
          width: 1,
          style: 3,
        },
        horzLine: {
          visible: true,
          labelVisible: true,
          color: colors.crosshairVertLineColor,
          labelBackgroundColor: colors.timeLabelBackgroundColor,
          width: 1,
          style: 3,
        },
      },
      grid: {
        vertLines: { color: colors.vertLineColor },
        horzLines: { color: colors.horzLineColor },
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: {
          top: 0,
          bottom: 0.3, // Leave space for volume at bottom
        },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderVisible: false,
        tickMarkFormatter: (time, tickMarkType) =>
          timeLocalization.formatTick(time, tickMarkType),
      },
      localization: {
        priceFormatter: (price: number) => {
          return Number(price).toFixed(pxDecimals);
        },
        timeFormatter: (time) => timeLocalization.formatHover(time),
      },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#0ECB81',
      downColor: '#F6465D',
      borderDownColor: '#F6465D',
      borderUpColor: '#0ECB81',
      wickDownColor: '#F6465D',
      wickUpColor: '#0ECB81',
      lastValueVisible: true,
      priceLineVisible: true,
      priceLineSource: 0,
      priceLineWidth: 1,
      priceLineColor: colors.priceLineColor,
      priceLineStyle: 2, // Dashed
      priceFormat: {
        type: 'price',
        precision: pxDecimals,
        minMove: 0.0000001,
      },
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#26a69a',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: 'volume',
      lastValueVisible: false,
      priceLineVisible: false,
    });

    chart.priceScale('volume').applyOptions({
      scaleMargins: {
        top: 0.7, // Volume takes bottom 25%
        bottom: 0,
      },
      alignLabels: false,
      autoScale: true,
      mode: 0, // Normal mode (not logarithmic)
      invertScale: false,
      borderVisible: false,
    });

    chartRef.current = chart;
    seriesRef.current = series;
    volumeSeriesRef.current = volumeSeries;

    setIsChartReady(true);

    // Subscribe to crosshair move for hover data
    chart.subscribeCrosshairMove((param) => {
      if (param.point === undefined || !param.time || param.paneIndex !== 0) {
        setChartHoverData({ visible: false });
        return;
      }

      const data = param.seriesData.get(series);
      const volumeData = param.seriesData.get(volumeSeries);
      if (data) {
        const candleData = data as CandlestickData;
        const volumeValue = (volumeData as HistogramData)?.value || 0;
        const timeStr = timeLocalization.formatHover(param.time as Time);

        setChartHoverData({
          time: timeStr,
          open: candleData.open,
          high: candleData.high,
          low: candleData.low,
          close: candleData.close,
          volume: volumeValue,
          visible: true,
          isPositiveChange: candleData.close - candleData.open > 0,
          delta: candleData.close - candleData.open,
          deltaPercent: (candleData.close - candleData.open) / candleData.open,
        });
      }
    });

    // Handle resize using ResizeObserver for better container tracking
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        const newWidth = chartContainerRef.current.offsetWidth || 800;
        const newHeight = chartContainerRef.current.offsetHeight || 400;
        chartRef.current.applyOptions({
          width: newWidth,
          height: newHeight,
        });
      }
    };

    let resizeObserver: ResizeObserver | null = null;
    if (chartContainerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        handleResize();
      });
      resizeObserver.observe(chartContainerRef.current);
    }

    window.addEventListener('resize', handleResize);

    const timeoutId = setTimeout(() => {
      handleResize();
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      Object.values(priceLineRefs.current).forEach((line) => {
        if (line && seriesRef.current) {
          seriesRef.current.removePriceLine(line);
        }
      });
      priceLineRefs.current = {};
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      volumeSeriesRef.current = null;

      setIsChartReady(false);
      setIsDataApplied(false);
    };
  }, [colors, pxDecimals, timeLocalization, isDarkTheme]);

  const fetchData = useMemoizedFn(
    async (targetCoin: string, targetInterval: string) => {
      const sdk = getPerpsSDK();
      const { start, end } = getTimeRange(targetInterval);
      const currentDataKey = `${targetCoin}-${targetInterval}`;

      try {
        const snapshot = await sdk.info.candleSnapshot(
          targetCoin,
          targetInterval,
          start,
          end
        );

        if (!isMountedRef.current) return;

        const candles = parseCandles(snapshot);
        const volumes = parseVolumes(snapshot);

        setPendingData({
          candles,
          volumes,
          dataKey: currentDataKey,
        });
      } catch (error) {
        console.error('Failed to fetch candle data:', error);
      }
    }
  );

  const showDisplayData = useMemo(() => {
    return chartHoverData.visible ? chartHoverData : latestCandle;
  }, [chartHoverData, latestCandle]);

  useEffect(() => {
    setIsDataApplied(false);
    setPendingData(null);

    fetchData(coin, selectedInterval);
  }, [coin, selectedInterval, fetchData]);

  useEffect(() => {
    if (!isChartReady || !pendingData || isDataApplied) return;
    if (!seriesRef.current || !volumeSeriesRef.current) return;

    if (pendingData.dataKey !== dataKey) return;

    const { candles, volumes } = pendingData;

    if (candles.length > 0) {
      seriesRef.current.setData(candles);
      // Save latest candle data
      const latest = candles[candles.length - 1];
      const latestVolume = volumes[volumes.length - 1]?.value || 0;
      setLatestCandle({
        open: latest.open,
        high: latest.high,
        low: latest.low,
        close: latest.close,
        volume: latestVolume,
        visible: false,
        isPositiveChange: latest.close - latest.open > 0,
        delta: latest.close - latest.open,
        deltaPercent: (latest.close - latest.open) / latest.open,
      });
    }
    if (volumes.length > 0) {
      volumeSeriesRef.current.setData(volumes);
    }

    setIsDataApplied(true);
  }, [isChartReady, pendingData, dataKey, isDataApplied]);

  const subscribeCandle = useMemoizedFn(() => {
    const sdk = getPerpsSDK();
    if (!seriesRef.current || !volumeSeriesRef.current) return;

    console.log('Subscribing to candles:', coin, selectedInterval);
    const { unsubscribe } = sdk.ws.subscribeToCandles(
      coin,
      selectedInterval,
      (snapshot) => {
        // Check if component is still mounted before updating
        if (
          !isMountedRef.current ||
          !seriesRef.current ||
          !volumeSeriesRef.current
        )
          return;

        const candles = parseCandles([snapshot]);
        const volumes = parseVolumes([snapshot]);
        if (candles.length > 0) {
          seriesRef.current?.update(candles[0]);
          // Update latest candle data
          const latest = candles[0];
          const latestVolume = volumes[0]?.value || 0;
          setLatestCandle({
            open: latest.open,
            high: latest.high,
            low: latest.low,
            close: latest.close,
            volume: latestVolume,
            visible: false,
            isPositiveChange: latest.close - latest.open > 0,
            delta: latest.close - latest.open,
            deltaPercent: (latest.close - latest.open) / latest.open,
          });
        }
        if (volumes.length > 0) {
          volumeSeriesRef.current?.update(volumes[0]);
        }
      }
    );

    return () => {
      console.log('Unsubscribing from candles:', coin, selectedInterval);
      unsubscribe();
    };
  });

  useEffect(() => {
    if (!isDataApplied || !seriesRef.current) return;

    const unsubscribe = subscribeCandle();

    return () => {
      unsubscribe?.();
    };
  }, [isDataApplied, subscribeCandle, coin, selectedInterval]);

  // Update price lines when lineTagInfo changes - only after data is applied
  useEffect(() => {
    if (!isDataApplied) return;
    if (seriesRef.current && chartRef.current) {
      updatePriceLines();
    }
  }, [updatePriceLines, isDataApplied]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const formatPercent = (value: number) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  return (
    <div className="w-full h-full flex flex-col bg-rb-neutral-bg-1">
      <div
        className={clsx(
          'flex px-16 py-12 gap-8',
          isScreenSmall() ? 'flex-col gap-4' : 'flex-row gap-8 items-center'
        )}
      >
        {/* Left: Interval selector */}
        <div className="flex gap-8 flex-shrink-0">
          {INTERVAL_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setSelectedInterval(option.value)}
              className={clsx(
                'px-10 py-4 text-12 rounded-[4px] font-medium transition-colors',
                selectedInterval === option.value
                  ? 'bg-r-blue-default text-white'
                  : 'text-r-neutral-body hover:bg-r-neutral-bg3'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-8 flex-shrink-0">
          {showDisplayData ? (
            <>
              <div className="flex flex-row items-center justify-center flex-shrink-0">
                <span className="text-13 text-r-neutral-foot">{'O '}</span>
                <span
                  className={clsx(
                    'text-13 font-medium',
                    showDisplayData.isPositiveChange
                      ? 'text-r-green-default'
                      : 'text-r-red-default'
                  )}
                >
                  {splitNumberByStep(showDisplayData.open || 0)}
                </span>
              </div>
              <div className="flex flex-row items-center justify-center flex-shrink-0">
                <span className="text-13 text-r-neutral-foot">H </span>
                <span
                  className={clsx(
                    'text-13 font-medium',
                    showDisplayData.isPositiveChange
                      ? 'text-r-green-default'
                      : 'text-r-red-default'
                  )}
                >
                  {splitNumberByStep(showDisplayData.high || 0)}
                </span>
              </div>
              <div className="flex flex-row items-center justify-center flex-shrink-0">
                <span className="text-13 text-r-neutral-foot">L </span>
                <span
                  className={clsx(
                    'text-13 font-medium',
                    showDisplayData.isPositiveChange
                      ? 'text-r-green-default'
                      : 'text-r-red-default'
                  )}
                >
                  {splitNumberByStep(showDisplayData.low || 0)}
                </span>
              </div>
              <div className="flex flex-row items-center justify-center flex-shrink-0">
                <span className="text-13 text-r-neutral-foot">C </span>
                <span
                  className={clsx(
                    'text-13 font-medium',
                    showDisplayData.isPositiveChange
                      ? 'text-r-green-default'
                      : 'text-r-red-default'
                  )}
                >
                  {splitNumberByStep(showDisplayData.close || 0)}
                </span>
              </div>
              <div className="flex flex-row items-center justify-center flex-shrink-0">
                <span className="text-13 text-r-neutral-foot">V </span>
                <span
                  className={clsx(
                    'text-13 font-medium',
                    showDisplayData.isPositiveChange
                      ? 'text-r-green-default'
                      : 'text-r-red-default'
                  )}
                >
                  {splitNumberByStep(
                    Number(showDisplayData.volume?.toFixed(2) || 0)
                  )}
                </span>
              </div>
              <div className="flex flex-row items-center justify-center flex-shrink-0">
                {/* <span className="text-13 text-r-neutral-foot"></span> */}
                <span
                  className={clsx(
                    'text-13 font-medium',
                    showDisplayData.isPositiveChange
                      ? 'text-r-green-default'
                      : 'text-r-red-default'
                  )}
                >
                  {showDisplayData.isPositiveChange ? '+' : '-'}
                  {splitNumberByStep(
                    Math.abs(showDisplayData.delta || 0).toFixed(pxDecimals)
                  )}{' '}
                  ({formatPercent(Math.abs(showDisplayData.deltaPercent || 0))})
                </span>
              </div>
            </>
          ) : null}
        </div>
      </div>

      <div ref={chartContainerRef} className="flex-1" />
    </div>
  );
};
