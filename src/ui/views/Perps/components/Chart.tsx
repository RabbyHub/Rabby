import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  UTCTimestamp,
  CandlestickSeries,
  ColorType,
} from 'lightweight-charts';
import { Candle, CandleSnapshot } from '@rabby-wallet/hyperliquid-sdk';
import { getPerpsSDK } from '../sdkManager';
import { useThemeMode } from '@/ui/hooks/usePreference';
import { CANDLE_MENU_KEY } from '../constants';

export type ChartProps = {
  coin: string;
  candleMenuKey: CANDLE_MENU_KEY;
};

const containerStyle: React.CSSProperties = {
  width: '100%',
  height: '160px',
  position: 'relative',
};

// CSS to hide TradingView watermark
const hideWatermarkStyles = `
  .tv-lightweight-charts table tr td div[style*="pointer-events"] {
    display: none !important;
  }
  .tv-lightweight-charts a[href*="tradingview"] {
    display: none !important;
  }
  .tv-lightweight-charts [class*="watermark"] {
    display: none !important;
  }
  .tv-lightweight-charts div[style*="z-index: 1000"] {
    display: none !important;
  }
`;

const getInterval = (candleMenuKey: CANDLE_MENU_KEY): string => {
  switch (candleMenuKey) {
    case CANDLE_MENU_KEY.ONE_HOUR:
      return '1m';
    case CANDLE_MENU_KEY.ONE_DAY:
      return '1h';
    case CANDLE_MENU_KEY.ONE_WEEK:
      return '4h';
    case CANDLE_MENU_KEY.ONE_MONTH:
      return '12h';
    case CANDLE_MENU_KEY.YTD:
      return '1d';
    case CANDLE_MENU_KEY.ALL:
      return '1d';
    default:
      return '1d';
  }
};

type CandleBar = CandlestickData<UTCTimestamp>;

const toUtc = (t: number): UTCTimestamp => Math.floor(t) as UTCTimestamp;

// Custom time formatter for hover display
const formatTime = (time: UTCTimestamp): string => {
  const date = new Date(time * 1000);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

const parseCandles = (data: CandleSnapshot): CandleBar[] => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return [];
  }

  const result = data.map((row: Candle) => {
    const candle = {
      time: toUtc(Number(row.t) / 1000),
      open: Number(row.o),
      high: Number(row.h),
      low: Number(row.l),
      close: Number(row.c),
    };
    return candle;
  });

  return result;
};

const getThemeColors = (isDark: boolean) =>
  isDark
    ? {
        vertLineColor: 'rgba(255, 255, 255, 0.06)',
        horzLineColor: 'rgba(255, 255, 255, 0.06)',
        textColor: 'rgba(255, 255, 255, 0.8)',
        bgColor: '#111214',
      }
    : {
        vertLineColor: 'rgba(46, 46, 46, 0.06)',
        horzLineColor: 'rgba(46, 46, 46, 0.06)',
        textColor: '#1f1f1f',
        bgColor: '#ffffff',
      };

const LightweightKlineChart: React.FC<ChartProps> = ({
  coin = 'ETH',
  candleMenuKey = CANDLE_MENU_KEY.ONE_DAY,
}) => {
  const { isDarkTheme } = useThemeMode();
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const isMountedRef = useRef(true);

  const colors = useMemo(() => getThemeColors(isDarkTheme), [isDarkTheme]);

  // Initialize chart
  useEffect(() => {
    if (!containerRef.current) return;

    if (chartRef.current) {
      chartRef.current.remove();
    }

    // Inject CSS to hide watermark
    if (!document.getElementById('hide-watermark-styles')) {
      const style = document.createElement('style');
      style.id = 'hide-watermark-styles';
      style.textContent = hideWatermarkStyles;
      document.head.appendChild(style);
    }

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: colors.bgColor },
        textColor: colors.textColor,
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
      },
      // localization: {
      //   timeFormatter: formatTime,
      // },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#0ECB81',
      downColor: '#F6465D',
      borderDownColor: '#F6465D',
      borderUpColor: '#0ECB81',
      wickDownColor: '#F6465D',
      wickUpColor: '#0ECB81',
    });

    chartRef.current = chart;
    seriesRef.current = series;

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [
    colors.bgColor,
    colors.horzLineColor,
    colors.textColor,
    colors.vertLineColor,
  ]);

  const fetchData = useCallback(
    async (aborted: boolean) => {
      const sdk = getPerpsSDK();
      if (!seriesRef.current) return;

      let start = 0;
      let end = Date.now();
      const interval = getInterval(candleMenuKey);

      switch (candleMenuKey) {
        case CANDLE_MENU_KEY.ONE_HOUR:
          start = end - 1 * 60 * 60 * 1000;
          break;
        case CANDLE_MENU_KEY.ONE_DAY:
          start = end - 1 * 24 * 60 * 60 * 1000;
          break;
        case CANDLE_MENU_KEY.ONE_WEEK:
          start = end - 1 * 7 * 24 * 60 * 60 * 1000;
          break;
        case CANDLE_MENU_KEY.ONE_MONTH:
          start = end - 1 * 30 * 24 * 60 * 60 * 1000;
          break;
        case CANDLE_MENU_KEY.YTD:
          start = new Date(new Date().getFullYear(), 0, 1).getTime();
          end = Date.now();
          break;
        case CANDLE_MENU_KEY.ALL:
          start = 0;
          end = Date.now();
          break;
      }

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
        chartRef.current?.timeScale().fitContent();
      }
    },
    [coin, candleMenuKey]
  );

  useEffect(() => {
    const sdk = getPerpsSDK();
    sdk.ws?.connect();
    return () => {
      sdk.ws?.disconnect();
    };
  }, []);

  // Fetch and set data
  useEffect(() => {
    let aborted = false;

    fetchData(aborted);
    return () => {
      aborted = true;
    };
  }, [coin, fetchData]);

  const subscribeCandle = useCallback(() => {
    const sdk = getPerpsSDK();
    if (!seriesRef.current) return;

    const interval = getInterval(candleMenuKey);
    console.log('subscribeCandle', coin, interval);
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
      unsubscribe();
    };
  }, [coin, candleMenuKey]);

  // Subscribe to real-time candle updates
  useEffect(() => {
    if (!seriesRef.current) return;

    const unsubscribe = subscribeCandle();

    return () => {
      // Cleanup WebSocket subscription
      unsubscribe?.();
    };
  }, [subscribeCandle]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return <div ref={containerRef} style={containerStyle} />;
};

export default LightweightKlineChart;
