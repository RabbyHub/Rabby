import React, { useCallback, useEffect, useMemo, useRef } from 'react';
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
} from 'lightweight-charts';
import type { Time } from 'lightweight-charts';
import { useThemeMode } from '@/ui/hooks/usePreference';
import { useRabbySelector } from '@/ui/store';
import { getPerpsSDK } from '@/ui/views/Perps/sdkManager';
import type { Candle, CandleSnapshot } from '@rabby-wallet/hyperliquid-sdk';

interface ChartWrapperProps {
  coin: string;
  interval: string;
  lineTagInfo?: {
    tpPrice?: number;
    slPrice?: number;
    liquidationPrice?: number;
    entryPrice?: number;
  };
  pxDecimals?: number;
}

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
    case '1h':
      start = end - 1 * 30 * 24 * 60 * 60 * 1000; // 1 month
      break;
    case '4h':
      start = end - 4 * 30 * 24 * 60 * 60 * 1000; // 4 months
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
  interval,
  lineTagInfo,
  pxDecimals = 2,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const priceLineRefs = useRef<{
    tp?: IPriceLine;
    sl?: IPriceLine;
    liquidation?: IPriceLine;
    entry?: IPriceLine;
  }>({});
  const isMountedRef = useRef(true);
  const { isDarkTheme } = useThemeMode();

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
  }, [lineTagInfo, colors]);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    if (chartRef.current) {
      chartRef.current.remove();
    }

    // Get initial dimensions with fallback
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
          style: 0,
        },
        horzLine: {
          visible: false,
          labelVisible: false,
        },
      },
      grid: {
        vertLines: { color: colors.vertLineColor },
        horzLines: { color: colors.horzLineColor },
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
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

    chartRef.current = chart;
    seriesRef.current = series;

    // Handle resize using ResizeObserver for better container tracking
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        const newWidth = chartContainerRef.current.clientWidth || 800;
        const newHeight = chartContainerRef.current.clientHeight || 400;
        chartRef.current.applyOptions({
          width: newWidth,
          height: newHeight,
        });
      }
    };

    // Use ResizeObserver to track container size changes
    let resizeObserver: ResizeObserver | null = null;
    if (chartContainerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        handleResize();
      });
      resizeObserver.observe(chartContainerRef.current);
    }

    // Also listen to window resize as fallback
    window.addEventListener('resize', handleResize);

    // Initial resize after a short delay to ensure layout is ready
    const timeoutId = setTimeout(() => {
      handleResize();
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      // Clear price lines
      Object.values(priceLineRefs.current).forEach((line) => {
        if (line && seriesRef.current) {
          seriesRef.current.removePriceLine(line);
        }
      });
      priceLineRefs.current = {};
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [colors, pxDecimals, timeLocalization, isDarkTheme]);

  // Fetch candle data
  const fetchData = useCallback(
    async (aborted: boolean) => {
      const sdk = getPerpsSDK();
      if (!seriesRef.current) return;

      const { start, end } = getTimeRange(interval);

      try {
        const snapshot = await sdk.info.candleSnapshot(
          coin,
          interval,
          start,
          end
        );

        if (aborted || !isMountedRef.current) return;

        const candles = parseCandles(snapshot);
        if (candles.length > 0 && seriesRef.current) {
          seriesRef.current.setData(candles);
          // Update price lines after data is loaded
          updatePriceLines();
        }
      } catch (error) {
        console.error('Failed to fetch candle data:', error);
      }
    },
    [coin, interval, updatePriceLines]
  );

  // Fetch data when coin or interval changes
  useEffect(() => {
    let aborted = false;

    fetchData(aborted);

    return () => {
      aborted = true;
    };
  }, [coin, interval, fetchData]);

  // Subscribe to WebSocket updates
  const subscribeCandle = useCallback(() => {
    const sdk = getPerpsSDK();
    if (!seriesRef.current) return;

    console.log('Subscribing to candles:', coin, interval);
    const { unsubscribe } = sdk.ws.subscribeToCandles(
      coin,
      interval,
      (snapshot) => {
        // Check if component is still mounted before updating
        if (!isMountedRef.current || !seriesRef.current) return;

        const candles = parseCandles([snapshot]);
        if (candles.length > 0) {
          seriesRef.current?.update(candles[0]);
        }
      }
    );

    return () => {
      console.log('Unsubscribing from candles:', coin, interval);
      unsubscribe();
    };
  }, [coin, interval]);

  // Subscribe to real-time candle updates
  useEffect(() => {
    if (!seriesRef.current) return;

    const unsubscribe = subscribeCandle();

    return () => {
      unsubscribe?.();
    };
  }, [subscribeCandle]);

  // Update price lines when lineTagInfo changes
  useEffect(() => {
    if (seriesRef.current && chartRef.current) {
      updatePriceLines();
    }
  }, [updatePriceLines]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return (
    <div ref={chartContainerRef} className="w-full h-full bg-rb-neutral-bg-1" />
  );
};
