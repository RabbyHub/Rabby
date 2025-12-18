import React, { useEffect, useRef, useState } from 'react';
import {
  CandlestickSeries,
  createChart,
  IChartApi,
  ISeriesApi,
} from 'lightweight-charts';
import { useThemeMode } from '@/ui/hooks/usePreference';
import { useRabbySelector } from '@/ui/store';
import { getPerpsSDK } from '@/ui/views/Perps/sdkManager';

interface ChartWrapperProps {
  coin: string;
  interval: string;
}

export const ChartWrapper: React.FC<ChartWrapperProps> = ({
  coin,
  interval,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const { isDarkTheme } = useThemeMode();

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: {
        background: {
          color: isDarkTheme ? '#1a1d1f' : '#ffffff',
        },
        textColor: isDarkTheme ? '#d1d4dc' : '#2b2f36',
      },
      grid: {
        vertLines: {
          color: isDarkTheme ? '#2b2f36' : '#e1e3eb',
        },
        horzLines: {
          color: isDarkTheme ? '#2b2f36' : '#e1e3eb',
        },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: isDarkTheme ? '#2b2f36' : '#e1e3eb',
      },
      timeScale: {
        borderColor: isDarkTheme ? '#2b2f36' : '#e1e3eb',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    chartRef.current = chart;
    seriesRef.current = candlestickSeries;

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [isDarkTheme]);

  useEffect(() => {
    if (!seriesRef.current) return;

    // Fetch candle data
    const fetchCandleData = async () => {
      try {
        const sdk = getPerpsSDK();
        const endTime = Date.now();
        const startTime = endTime - 24 * 60 * 60 * 1000; // Last 24 hours

        const candles = await sdk.info.candleSnapshot(
          coin,
          interval,
          startTime,
          endTime
        );

        if (candles && candles.length > 0 && seriesRef.current) {
          const formattedData = candles.map((candle) => ({
            time: Math.floor(candle.T / 1000) as any,
            open: Number(candle.o),
            high: Number(candle.h),
            low: Number(candle.l),
            close: Number(candle.c),
          }));

          seriesRef.current.setData(formattedData);
        }
      } catch (error) {
        console.error('Failed to fetch candle data:', error);
      }
    };

    fetchCandleData();
  }, [coin, interval]);

  return (
    <div ref={chartContainerRef} className="w-full h-full bg-rb-neutral-bg-1" />
  );
};
