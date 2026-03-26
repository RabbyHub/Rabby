import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  UTCTimestamp,
  CandlestickSeries,
  ColorType,
  IPriceLine,
  CrosshairMode,
  TickMarkType,
} from 'lightweight-charts';
import type { Time } from 'lightweight-charts';
import {
  Candle,
  CandleSnapshot,
  WsActiveAssetCtx,
} from '@rabby-wallet/hyperliquid-sdk';
import { getPerpsSDK } from '../sdkManager';
import { useThemeMode } from '@/ui/hooks/usePreference';
import {
  CANDLE_MENU_KEY,
  CANDLE_MENU_KEY_V2,
  CandlePeriod,
} from '../constants';
import clsx from 'clsx';
import { MarketData } from '@/ui/models/perps';
import { useTranslation } from 'react-i18next';
// local formatter to avoid cross-screen import
const formatPercent = (value: number, decimals = 8) => {
  return `${(value * 100).toFixed(decimals)}%`;
};
import { splitNumberByStep, useWallet } from '@/ui/utils';
import { ReactComponent as RcIconFullscreen } from '@/ui/assets/perps/Iconfullscreen.svg';
import { formatLocalDateTime } from '../../DesktopPerps/components/ChartArea/components/ChartWrapper';
import { obj2query } from '@/ui/utils/url';
import { useRabbySelector } from '@/ui/store';

export type ChartProps = {
  coin: string;
  candleMenuKey: CANDLE_MENU_KEY_V2;
  lineTagInfo: {
    tpPrice: number;
    slPrice: number;
    liquidationPrice: number;
    entryPrice: number;
  };
  onHoverData?: (data: ChartHoverData) => void;
  pxDecimals: number;
};

export interface ChartHoverData {
  time?: string;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  isPositiveChange?: boolean;
  delta?: number;
  deltaPercent?: number;
  visible: boolean;
}

const containerStyle: React.CSSProperties = {
  width: '100%',
  height: '160px',
  position: 'relative',
};

const getInterval = (candleMenuKey: CANDLE_MENU_KEY_V2) => {
  switch (candleMenuKey) {
    case CANDLE_MENU_KEY_V2.FIVE_MINUTES:
      return CandlePeriod.FIVE_MINUTES;
    case CANDLE_MENU_KEY_V2.FIFTEEN_MINUTES:
      return CandlePeriod.FIFTEEN_MINUTES;
    case CANDLE_MENU_KEY_V2.ONE_HOUR:
      return CandlePeriod.ONE_HOUR;
    case CANDLE_MENU_KEY_V2.FOUR_HOURS:
      return CandlePeriod.FOUR_HOURS;
    case CANDLE_MENU_KEY_V2.ONE_DAY:
      return CandlePeriod.ONE_DAY;
    case CANDLE_MENU_KEY_V2.ONE_WEEK:
      return CandlePeriod.ONE_WEEK;
    default:
      return CandlePeriod.FIVE_MINUTES;
  }
};

type CandleBar = CandlestickData<UTCTimestamp>;

const toUtc = (t: number): UTCTimestamp => Math.floor(t) as UTCTimestamp;

const padZero = (value: number) => String(value).padStart(2, '0');

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

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

const formatTickLabel = (date: Date, tickMarkType: TickMarkType): string => {
  const year = String(date.getFullYear()).slice(-2);
  const mon = MONTHS[date.getMonth()];
  const day = padZero(date.getDate());
  const hours = padZero(date.getHours());
  const minutes = padZero(date.getMinutes());
  const seconds = padZero(date.getSeconds());

  switch (tickMarkType) {
    case TickMarkType.Year:
      return String(date.getFullYear());
    case TickMarkType.Month:
      return `${mon} '${year}`;
    case TickMarkType.DayOfMonth:
      return `${day} ${mon}`;
    case TickMarkType.TimeWithSeconds:
      return `${hours}:${minutes}:${seconds}`;
    case TickMarkType.Time:
      return `${hours}:${minutes}`;
    default:
      return `${day} ${mon} '${year}`;
  }
};

const createTimeLocalization = (noTime = false) => {
  const formatTick = (time: Time, tickMarkType: TickMarkType): string =>
    formatTickLabel(timeToDate(time), tickMarkType);

  const formatHover = (time: Time): string => formatLocalDateTime(time, noTime);

  return {
    locale: 'en-US',
    formatHover,
    formatTick,
  };
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

// Get the Monday 00:00 UTC timestamp for the week containing the given timestamp
const getMondayUtc = (utcSeconds: number): UTCTimestamp => {
  const date = new Date(utcSeconds * 1000);
  const day = date.getUTCDay(); // 0=Sun,1=Mon,...,6=Sat
  const diffDays = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + diffDays);
  date.setUTCHours(0, 0, 0, 0);
  return Math.floor(date.getTime() / 1000) as UTCTimestamp;
};

// Aggregate daily candles into Monday-start weekly candles with correct OHLC
const aggregateDailyToWeekly = (dailyCandles: CandleBar[]): CandleBar[] => {
  if (dailyCandles.length === 0) return [];

  const weeks = new Map<number, CandleBar>();

  for (const candle of dailyCandles) {
    const mondayTs = getMondayUtc(candle.time as number);
    const existing = weeks.get(mondayTs);
    if (existing) {
      existing.high = Math.max(existing.high, candle.high);
      existing.low = Math.min(existing.low, candle.low);
      existing.close = candle.close;
    } else {
      weeks.set(mondayTs, {
        time: mondayTs,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      });
    }
  }

  return Array.from(weeks.values()).sort(
    (a, b) => (a.time as number) - (b.time as number)
  );
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

const LightweightKlineChart: React.FC<ChartProps> = ({
  coin = 'ETH',
  candleMenuKey = CANDLE_MENU_KEY_V2.ONE_DAY,
  lineTagInfo,
  pxDecimals,
  onHoverData,
}) => {
  const { isDarkTheme } = useThemeMode();
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const priceLineRefs = useRef<{
    tp?: IPriceLine;
    sl?: IPriceLine;
    liquidation?: IPriceLine;
    entry?: IPriceLine;
  }>({});
  const isMountedRef = useRef(true);
  const currentWeekCandleRef = useRef<CandleBar | null>(null);
  const colors = useMemo(() => getThemeColors(isDarkTheme), [isDarkTheme]);
  const isWeekly = candleMenuKey === CANDLE_MENU_KEY_V2.ONE_WEEK;
  const timeLocalization = useMemo(() => createTimeLocalization(isWeekly), [
    isWeekly,
  ]);

  // Update price lines function
  const updatePriceLines = useCallback(() => {
    if (!seriesRef.current || !chartRef.current) return;

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
  }, [lineTagInfo, t]);

  // Initialize chart
  useEffect(() => {
    if (!containerRef.current) return;

    if (chartRef.current) {
      chartRef.current.remove();
    }

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
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
      // 设置最新价格线样式
      lastValueVisible: true,
      priceLineVisible: true,
      priceLineSource: 0,
      priceLineWidth: 1,
      priceLineColor: colors.priceLineColor,
      priceLineStyle: 2, // 虚线
      priceFormat: {
        type: 'price',
        precision: pxDecimals,
        minMove: 0.0000001,
      },
    });

    chartRef.current = chart;
    seriesRef.current = series;

    // 订阅十字线移动事件来获取鼠标悬停数据
    chart.subscribeCrosshairMove((param) => {
      if (param.point === undefined || !param.time || param.paneIndex !== 0) {
        // 鼠标不在图表上或没有时间信息
        const hoverData = { visible: false };
        onHoverData?.(hoverData);
        return;
      }

      // 获取当前时间点的蜡烛数据
      const data = param.seriesData.get(series);
      if (data) {
        const candleData = data as CandlestickData;
        const timeStr = timeLocalization.formatHover(param.time as Time);

        const hoverData = {
          time: timeStr,
          open: candleData.open,
          high: candleData.high,
          low: candleData.low,
          close: candleData.close,
          visible: true,
          isPositiveChange: candleData.close - candleData.open > 0,
          delta: candleData.close - candleData.open,
          deltaPercent: (candleData.close - candleData.open) / candleData.open,
        };

        onHoverData?.(hoverData);
      }
    });

    return () => {
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
  }, [
    colors.bgColor,
    colors.horzLineColor,
    colors.textColor,
    colors.vertLineColor,
    pxDecimals,
    timeLocalization,
  ]);

  const fetchData = useCallback(
    async (aborted: boolean) => {
      const sdk = getPerpsSDK();
      if (!seriesRef.current) return;

      const isWeekly = candleMenuKey === CANDLE_MENU_KEY_V2.ONE_WEEK;
      let start = 0;
      let end = Date.now();
      // For weekly: fetch daily candles and aggregate client-side to start weeks on Monday
      const interval = isWeekly
        ? CandlePeriod.ONE_DAY
        : getInterval(candleMenuKey);

      switch (candleMenuKey) {
        case CANDLE_MENU_KEY_V2.FIVE_MINUTES:
          start = end - 1 * 24 * 60 * 60 * 1000; // 1 day
          break;
        case CANDLE_MENU_KEY_V2.FIFTEEN_MINUTES:
          start = end - 7 * 24 * 60 * 60 * 1000; // 1 week
          break;
        case CANDLE_MENU_KEY_V2.ONE_HOUR:
          start = end - 1 * 30 * 24 * 60 * 60 * 1000; // 1 month
          break;
        case CANDLE_MENU_KEY_V2.FOUR_HOURS:
          start = end - 4 * 30 * 24 * 60 * 60 * 1000; // 4 months
          break;
        case CANDLE_MENU_KEY_V2.ONE_DAY:
          start = end - 12 * 30 * 24 * 60 * 60 * 1000; // 1 years;
          end = Date.now();
          break;
        case CANDLE_MENU_KEY_V2.ONE_WEEK:
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

      const dailyCandles = parseCandles(snapshot);
      const candles = isWeekly
        ? aggregateDailyToWeekly(dailyCandles)
        : dailyCandles;

      if (candles.length > 0 && seriesRef.current) {
        seriesRef.current.setData(candles);
        if (isWeekly) {
          currentWeekCandleRef.current = {
            ...candles[candles.length - 1],
          };
        }
        updatePriceLines();
      }
    },
    [coin, candleMenuKey]
  );

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

    const isWeekly = candleMenuKey === CANDLE_MENU_KEY_V2.ONE_WEEK;
    // Subscribe to daily candles in weekly mode for correct Monday-based aggregation
    const interval = isWeekly
      ? CandlePeriod.ONE_DAY
      : getInterval(candleMenuKey);
    console.log('subscribeCandle', coin, interval);
    const { unsubscribe } = sdk.ws.subscribeToCandles(
      coin,
      interval,
      (snapshot) => {
        if (!isMountedRef.current || !seriesRef.current) return;

        const candles = parseCandles([snapshot]);
        if (candles.length === 0) return;

        if (isWeekly) {
          const daily = candles[0];
          const mondayTs = getMondayUtc(daily.time as number);
          const current = currentWeekCandleRef.current;

          if (current && current.time === mondayTs) {
            // Same week: merge high/low, update close
            current.high = Math.max(current.high, daily.high);
            current.low = Math.min(current.low, daily.low);
            current.close = daily.close;
          } else {
            // New week starts
            currentWeekCandleRef.current = {
              time: mondayTs,
              open: daily.open,
              high: daily.high,
              low: daily.low,
              close: daily.close,
            };
          }
          seriesRef.current?.update(currentWeekCandleRef.current!);
        } else {
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
    <div style={{ position: 'relative' }}>
      <div ref={containerRef} style={containerStyle} />
    </div>
  );
};

export const PerpsChart = ({
  coin,
  markPrice,
  currentAssetCtx,
  activeAssetCtx,
  lineTagInfo,
}: {
  coin: string;
  markPrice: number;
  currentAssetCtx: MarketData;
  activeAssetCtx: WsActiveAssetCtx['ctx'] | null;
  lineTagInfo: {
    tpPrice: number;
    slPrice: number;
    liquidationPrice: number;
    entryPrice: number;
  };
}) => {
  const { t } = useTranslation();
  const wallet = useWallet();
  const [
    selectedInterval,
    setSelectedInterval,
  ] = React.useState<CANDLE_MENU_KEY_V2>(CANDLE_MENU_KEY_V2.FIFTEEN_MINUTES);

  // 状态用于存储图表的悬停数据
  const [chartHoverData, setChartHoverData] = React.useState<ChartHoverData>({
    visible: false,
  });
  const CANDLE_MENU_ITEM = useMemo(
    () => [
      {
        label: '5M',
        key: CANDLE_MENU_KEY_V2.FIVE_MINUTES,
      },
      {
        label: '15M',
        key: CANDLE_MENU_KEY_V2.FIFTEEN_MINUTES,
      },
      {
        label: '1H',
        key: CANDLE_MENU_KEY_V2.ONE_HOUR,
      },
      {
        label: '4H',
        key: CANDLE_MENU_KEY_V2.FOUR_HOURS,
      },
      {
        label: '1D',
        key: CANDLE_MENU_KEY_V2.ONE_DAY,
      },
      {
        label: '1W',
        key: CANDLE_MENU_KEY_V2.ONE_WEEK,
      },
    ],
    []
  );

  const dayDelta = useMemo(() => {
    const prevDayPx = Number(
      activeAssetCtx?.prevDayPx || currentAssetCtx?.prevDayPx || 0
    );
    return markPrice - prevDayPx;
  }, [activeAssetCtx, markPrice, currentAssetCtx]);

  const isPositiveChange = useMemo(() => {
    return dayDelta >= 0;
  }, [dayDelta]);

  const dayDeltaPercent = useMemo(() => {
    const prevDayPx = Number(
      activeAssetCtx?.prevDayPx || currentAssetCtx?.prevDayPx || 0
    );
    return dayDelta / prevDayPx;
  }, [activeAssetCtx, currentAssetCtx, dayDelta]);

  const decimals = useMemo(() => {
    return currentAssetCtx?.pxDecimals || 2;
  }, [currentAssetCtx]);

  const currentPerpsAccount = useRabbySelector(
    (state) => state.perps.currentPerpsAccount
  );

  return (
    <div
      className={clsx('bg-r-neutral-card1 rounded-[12px] p-16 mb-20 relative')}
    >
      {!chartHoverData.visible && (
        <div
          className="absolute top-12 right-12 cursor-pointer text-r-neutral-body p-4 rounded-[4px] hovepr:bg-r-neutral-bg3"
          onClick={() => {
            wallet.setPerpsCurrentAccount(currentPerpsAccount);
            wallet.switchDesktopPerpsAccount(currentPerpsAccount!);
            wallet.openInDesktop(
              `/desktop/perps?${obj2query({
                coin: coin,
              })}`
            );
          }}
        >
          <RcIconFullscreen className="text-r-neutral-body" />
        </div>
      )}
      <div className="text-center mb-8">
        {chartHoverData.visible ? (
          <div>
            <div className="flex justify-between items-center h-[52px]">
              <div className="flex flex-1 flex-col items-center">
                <div className="text-15 font-medium text-r-neutral-title-1">
                  {splitNumberByStep(chartHoverData.open || 0)}
                </div>
                <div className="text-13 text-r-neutral-foot">Open</div>
              </div>
              <div className="flex flex-1 flex-col items-center">
                <div className="text-15 font-medium text-r-neutral-title-1">
                  {splitNumberByStep(chartHoverData.high || 0)}
                </div>
                <div className="text-13 text-r-neutral-foot">High</div>
              </div>
              <div className="flex flex-1 flex-col items-center">
                <div className="text-15 font-medium text-r-neutral-title-1">
                  {splitNumberByStep(chartHoverData.low || 0)}
                </div>
                <div className="text-13 text-r-neutral-foot">Low</div>
              </div>
              <div className="flex flex-1 flex-col items-center">
                <div className="text-15 font-medium text-r-neutral-title-1">
                  {splitNumberByStep(chartHoverData.close || 0)}
                </div>
                <div className="text-13 text-r-neutral-foot">Close</div>
              </div>
            </div>
            <div
              className={clsx(
                'text-14 font-medium',
                chartHoverData.isPositiveChange
                  ? 'text-r-green-default'
                  : 'text-r-red-default'
              )}
            >
              {chartHoverData.isPositiveChange ? '+' : '-'}$
              {splitNumberByStep(
                Math.abs(Number(chartHoverData.delta?.toFixed(decimals)))
              )}{' '}
              ({chartHoverData.isPositiveChange ? '+' : ''}
              {formatPercent(chartHoverData.deltaPercent || 0, 2)})
            </div>
          </div>
        ) : (
          <div>
            <div className="text-[32px] font-bold text-r-neutral-title-1 h-[52px] flex items-center justify-center text-center">
              ${splitNumberByStep(markPrice)}
            </div>
            <div
              className={clsx(
                'text-14 font-medium',
                isPositiveChange ? 'text-r-green-default' : 'text-r-red-default'
              )}
            >
              {isPositiveChange ? '+' : '-'}$
              {splitNumberByStep(Math.abs(Number(dayDelta.toFixed(decimals))))}{' '}
              ({isPositiveChange ? '+' : ''}
              {formatPercent(dayDeltaPercent, 2)})
            </div>
          </div>
        )}
      </div>

      <div className="h-[160px]">
        <LightweightKlineChart
          coin={coin}
          candleMenuKey={selectedInterval}
          lineTagInfo={lineTagInfo}
          onHoverData={setChartHoverData}
          pxDecimals={decimals}
        />
      </div>

      <div className="flex justify-center gap-12 mt-10">
        {CANDLE_MENU_ITEM.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setSelectedInterval(key)}
            className={clsx(
              'px-10 py-4 text-12 rounded-[4px]',
              key === selectedInterval
                ? 'bg-r-blue-default text-white'
                : 'text-r-neutral-body hover:bg-r-neutral-bg3'
            )}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default PerpsChart;
