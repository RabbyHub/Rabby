import React, { useEffect, useMemo, useRef } from 'react';
import type { Candle, CandleSnapshot } from '@rabby-wallet/hyperliquid-sdk';
import { getPerpsSDK } from '../sdkManager';

const BRIDGE_CHANNEL = 'rabby-tradingview-bridge-v1';
const DEFAULT_TRADINGVIEW_URL = 'https://tradingview.rabby.io/';

type TradingViewResolution =
  | '1'
  | '5'
  | '15'
  | '30'
  | '60'
  | '240'
  | '480'
  | '1D'
  | '1W';
type PerpsInterval =
  | '1m'
  | '5m'
  | '15m'
  | '30m'
  | '1h'
  | '4h'
  | '8h'
  | '1d'
  | '1w';

type TVBar = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type BridgeMessage =
  | {
      channel: typeof BRIDGE_CHANNEL;
      kind: 'request';
      id: number;
      method: string;
      params?: Record<string, any>;
    }
  | {
      channel: typeof BRIDGE_CHANNEL;
      kind: 'response';
      id: number;
      ok: boolean;
      result?: any;
      error?: string;
    }
  | {
      channel: typeof BRIDGE_CHANNEL;
      kind: 'event';
      event: string;
      payload?: any;
    }
  | {
      channel: typeof BRIDGE_CHANNEL;
      kind: 'command';
      command: string;
      payload?: any;
    };

type BarSubscription = {
  unsubscribe: () => void;
  currentWeekBar: TVBar | null;
  lastDailyVolume: { time: number; value: number } | null;
  isWeekly: boolean;
};

type WeeklyHistoryState = {
  currentWeekBar: TVBar;
  lastDailyVolume: { time: number; value: number } | null;
};

export interface TradingViewHoverData {
  time?: number;
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

export interface TradingViewLineTagInfo {
  tpPrice: number;
  slPrice: number;
  liquidationPrice: number;
  entryPrice: number;
}

interface TradingViewIframeChartProps {
  coin: string;
  interval: PerpsInterval;
  pxDecimals: number;
  isDarkTheme: boolean;
  locale: string;
  timezone: string;
  lineTagInfo: TradingViewLineTagInfo;
  widgetConfig?: {
    disabled_features?: string[];
    enabled_features?: string[];
    favorites?: {
      intervals?: string[];
    };
    hideVolume?: boolean;
    overrides?: Record<string, string | number | boolean>;
  };
  className?: string;
  onHoverData?: (data: TradingViewHoverData) => void;
  onLatestBar?: (data: TradingViewHoverData) => void;
  onIntervalChange?: (interval: PerpsInterval) => void;
}

const SUPPORTED_RESOLUTIONS: TradingViewResolution[] = [
  '1',
  '5',
  '15',
  '30',
  '60',
  '240',
  '480',
  '1D',
  '1W',
];

const intervalToResolution = (
  interval: PerpsInterval
): TradingViewResolution => {
  switch (interval) {
    case '1m':
      return '1';
    case '5m':
      return '5';
    case '15m':
      return '15';
    case '30m':
      return '30';
    case '1h':
      return '60';
    case '4h':
      return '240';
    case '8h':
      return '480';
    case '1d':
      return '1D';
    case '1w':
      return '1W';
    default:
      return '15';
  }
};

const resolutionToInterval = (resolution: string): PerpsInterval => {
  switch (resolution) {
    case '1':
      return '1m';
    case '5':
      return '5m';
    case '15':
      return '15m';
    case '30':
      return '30m';
    case '60':
      return '1h';
    case '240':
      return '4h';
    case '480':
      return '8h';
    case '1D':
      return '1d';
    case '1W':
      return '1w';
    default:
      return '15m';
  }
};

const getTimeRange = (interval: PerpsInterval) => {
  const end = Date.now();
  let start = 0;

  switch (interval) {
    case '1m':
    case '5m':
      start = end - 1 * 24 * 60 * 60 * 1000;
      break;
    case '15m':
    case '30m':
      start = end - 7 * 24 * 60 * 60 * 1000;
      break;
    case '1h':
      start = end - 1 * 30 * 24 * 60 * 60 * 1000;
      break;
    case '4h':
      start = end - 4 * 30 * 24 * 60 * 60 * 1000;
      break;
    case '8h':
      start = end - 8 * 30 * 24 * 60 * 60 * 1000;
      break;
    case '1d':
      start = end - 12 * 30 * 24 * 60 * 60 * 1000;
      break;
    case '1w':
      start = 0;
      break;
    default:
      start = end - 7 * 24 * 60 * 60 * 1000;
  }

  return { start, end };
};

const getMondayUtc = (utcMs: number): number => {
  const date = new Date(utcMs);
  const day = date.getUTCDay();
  const diffDays = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + diffDays);
  date.setUTCHours(0, 0, 0, 0);
  return date.getTime();
};

const parseBars = (data: CandleSnapshot): TVBar[] => {
  if (!data?.length) {
    return [];
  }

  return data.map((row: Candle) => ({
    time: Number(row.t),
    open: Number(row.o),
    high: Number(row.h),
    low: Number(row.l),
    close: Number(row.c),
    volume: Number(row.v || 0),
  }));
};

const aggregateDailyToWeeklyBars = (dailyBars: TVBar[]): TVBar[] => {
  if (!dailyBars.length) return [];

  const weeks = new Map<number, TVBar>();

  for (const bar of dailyBars) {
    const mondayTs = getMondayUtc(bar.time);
    const existing = weeks.get(mondayTs);
    if (existing) {
      existing.high = Math.max(existing.high, bar.high);
      existing.low = Math.min(existing.low, bar.low);
      existing.close = bar.close;
      existing.volume += bar.volume;
    } else {
      weeks.set(mondayTs, {
        time: mondayTs,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: bar.volume,
      });
    }
  }

  return Array.from(weeks.values()).sort((a, b) => a.time - b.time);
};

const getWeeklyHistoryKey = (symbol: string, resolution: string) =>
  `${symbol.toLowerCase()}:${resolution}`;

const getLatestWeeklyHistoryState = (
  weeklyBars: TVBar[],
  dailyBars: TVBar[]
): WeeklyHistoryState | null => {
  const currentWeekBar = weeklyBars[weeklyBars.length - 1];
  if (!currentWeekBar) return null;

  const lastDailyBar = dailyBars
    .slice()
    .reverse()
    .find((bar) => getMondayUtc(bar.time) === currentWeekBar.time);

  return {
    currentWeekBar: { ...currentWeekBar },
    lastDailyVolume: lastDailyBar
      ? {
          time: lastDailyBar.time,
          value: lastDailyBar.volume,
        }
      : null,
  };
};

const cloneWeeklyHistoryState = (
  historyState: WeeklyHistoryState | null | undefined
): WeeklyHistoryState | null => {
  if (!historyState) return null;

  return {
    currentWeekBar: { ...historyState.currentWeekBar },
    lastDailyVolume: historyState.lastDailyVolume
      ? { ...historyState.lastDailyVolume }
      : null,
  };
};

const toHoverData = (bar: TVBar): TradingViewHoverData => {
  const delta = bar.close - bar.open;
  return {
    time: bar.time,
    open: bar.open,
    high: bar.high,
    low: bar.low,
    close: bar.close,
    volume: bar.volume,
    visible: false,
    isPositiveChange: delta >= 0,
    delta,
    deltaPercent: bar.open ? delta / bar.open : 0,
  };
};

const getTradingViewBaseUrl = () => {
  const local = window.localStorage.getItem('perps:tradingview:url');
  return local || DEFAULT_TRADINGVIEW_URL;
};

export const normalizeTradingViewLocale = (lang: string) => {
  const normalized = (lang || 'en').toLowerCase();

  if (normalized.startsWith('zh')) return 'zh';
  if (normalized.startsWith('ja')) return 'ja';
  if (normalized.startsWith('ko')) return 'ko';
  if (normalized.startsWith('fr')) return 'fr';
  if (normalized.startsWith('de')) return 'de_DE';
  if (normalized.startsWith('es')) return 'es';
  if (normalized.startsWith('it')) return 'it';
  if (normalized.startsWith('ru')) return 'ru';
  if (normalized.startsWith('tr')) return 'tr';
  if (normalized.startsWith('pt')) return 'pt';
  if (normalized.startsWith('vi')) return 'vi';
  if (normalized.startsWith('id')) return 'id';
  if (normalized.startsWith('th')) return 'th_TH';
  return 'en';
};

export const TradingViewIframeChart: React.FC<TradingViewIframeChartProps> = ({
  coin,
  interval,
  pxDecimals,
  isDarkTheme,
  locale,
  timezone,
  lineTagInfo,
  widgetConfig,
  className,
  onHoverData,
  onLatestBar,
  onIntervalChange,
}) => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const subscriptionsRef = useRef<Map<string, BarSubscription>>(new Map());
  const weeklyHistoryRef = useRef<Map<string, WeeklyHistoryState>>(new Map());
  const iframeIntervalChangeRef = useRef(false);

  const iframeUrl = useMemo(() => {
    const base = getTradingViewBaseUrl();
    const url = new URL(base);
    url.searchParams.set('source', 'rabby');
    return url.toString();
  }, []);

  const iframeOrigin = useMemo(() => {
    try {
      return new URL(iframeUrl).origin;
    } catch (error) {
      return '*';
    }
  }, [iframeUrl]);

  const postToIframe = (message: BridgeMessage) => {
    if (!iframeRef.current?.contentWindow) return;
    iframeRef.current.contentWindow.postMessage(message, iframeOrigin);
  };

  const stateRef = useRef({
    coin,
    interval,
    pxDecimals,
    isDarkTheme,
    locale,
    timezone,
    lineTagInfo,
    widgetConfig,
    onHoverData,
    onLatestBar,
    onIntervalChange,
  });

  useEffect(() => {
    stateRef.current = {
      coin,
      interval,
      pxDecimals,
      isDarkTheme,
      locale,
      timezone,
      lineTagInfo,
      widgetConfig,
      onHoverData,
      onLatestBar,
      onIntervalChange,
    };
  }, [
    coin,
    interval,
    pxDecimals,
    isDarkTheme,
    locale,
    timezone,
    lineTagInfo,
    widgetConfig,
    onHoverData,
    onLatestBar,
    onIntervalChange,
  ]);

  useEffect(() => {
    const cleanupSubscriptions = () => {
      subscriptionsRef.current.forEach((sub) => sub.unsubscribe());
      subscriptionsRef.current.clear();
    };

    const handleGetBars = async (params: {
      symbol: string;
      resolution: string;
      periodParams?: {
        from?: number;
        to?: number;
      };
    }) => {
      const sdk = getPerpsSDK();
      const targetInterval = resolutionToInterval(params.resolution);
      const isWeekly = targetInterval === '1w';
      const fetchInterval: PerpsInterval = isWeekly ? '1d' : targetInterval;
      const fallbackRange = getTimeRange(targetInterval);
      const start = params.periodParams?.from
        ? params.periodParams.from * 1000
        : fallbackRange.start;
      const end = params.periodParams?.to
        ? params.periodParams.to * 1000
        : fallbackRange.end;

      const snapshot = await sdk.info.candleSnapshot(
        params.symbol,
        fetchInterval,
        start,
        end
      );
      const dailyBars = parseBars(snapshot);
      const bars = isWeekly ? aggregateDailyToWeeklyBars(dailyBars) : dailyBars;
      if (isWeekly) {
        const historyState = getLatestWeeklyHistoryState(bars, dailyBars);
        const historyKey = getWeeklyHistoryKey(
          params.symbol,
          params.resolution
        );
        if (historyState) {
          weeklyHistoryRef.current.set(historyKey, historyState);
        } else {
          weeklyHistoryRef.current.delete(historyKey);
        }
      }
      if (bars.length) {
        stateRef.current.onLatestBar?.(toHoverData(bars[bars.length - 1]));
      }
      return {
        bars,
        noData: bars.length === 0,
      };
    };

    const handleSubscribeBars = (params: {
      symbol: string;
      resolution: string;
      subscriberUID: string;
    }) => {
      const sdk = getPerpsSDK();
      const targetInterval = resolutionToInterval(params.resolution);
      const isWeekly = targetInterval === '1w';
      const subscribeInterval: PerpsInterval = isWeekly ? '1d' : targetInterval;
      const weeklyHistoryKey = getWeeklyHistoryKey(
        params.symbol,
        params.resolution
      );
      const current = subscriptionsRef.current.get(params.subscriberUID);
      if (current) {
        current.unsubscribe();
        subscriptionsRef.current.delete(params.subscriberUID);
      }

      const state: BarSubscription = {
        unsubscribe: () => undefined,
        currentWeekBar: null,
        lastDailyVolume: null,
        isWeekly,
      };

      const subscription = sdk.ws.subscribeToCandles(
        params.symbol,
        subscribeInterval,
        (snapshot) => {
          const parsed = parseBars([snapshot]);
          if (!parsed.length) return;
          const dayBar = parsed[0];

          if (!state.isWeekly) {
            postToIframe({
              channel: BRIDGE_CHANNEL,
              kind: 'event',
              event: 'realtimeBar',
              payload: {
                subscriberUID: params.subscriberUID,
                bar: dayBar,
              },
            });
            stateRef.current.onLatestBar?.(toHoverData(dayBar));
            return;
          }

          const mondayTs = getMondayUtc(dayBar.time);
          if (!state.currentWeekBar) {
            const historyState = cloneWeeklyHistoryState(
              weeklyHistoryRef.current.get(weeklyHistoryKey)
            );
            if (!historyState) {
              return;
            }
            state.currentWeekBar = historyState.currentWeekBar;
            state.lastDailyVolume = historyState.lastDailyVolume;
          }

          const currentWeekBar = state.currentWeekBar;
          if (currentWeekBar && currentWeekBar.time === mondayTs) {
            currentWeekBar.high = Math.max(currentWeekBar.high, dayBar.high);
            currentWeekBar.low = Math.min(currentWeekBar.low, dayBar.low);
            currentWeekBar.close = dayBar.close;

            const prevDayVolume =
              state.lastDailyVolume?.time === dayBar.time
                ? state.lastDailyVolume.value
                : 0;
            currentWeekBar.volume =
              currentWeekBar.volume - prevDayVolume + dayBar.volume;
          } else {
            state.currentWeekBar = {
              ...dayBar,
              time: mondayTs,
            };
          }

          state.lastDailyVolume = {
            time: dayBar.time,
            value: dayBar.volume,
          };

          if (state.currentWeekBar) {
            postToIframe({
              channel: BRIDGE_CHANNEL,
              kind: 'event',
              event: 'realtimeBar',
              payload: {
                subscriberUID: params.subscriberUID,
                bar: state.currentWeekBar,
              },
            });
            stateRef.current.onLatestBar?.(toHoverData(state.currentWeekBar));
          }
        }
      );

      state.unsubscribe = subscription.unsubscribe;
      subscriptionsRef.current.set(params.subscriberUID, state);
      return { ok: true };
    };

    const handleUnsubscribeBars = (params: { subscriberUID: string }) => {
      const current = subscriptionsRef.current.get(params.subscriberUID);
      if (current) {
        current.unsubscribe();
        subscriptionsRef.current.delete(params.subscriberUID);
      }
      return { ok: true };
    };

    const handleMessage = async (event: MessageEvent) => {
      const message = event.data as BridgeMessage;
      if (!message || message.channel !== BRIDGE_CHANNEL) return;
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (iframeOrigin !== '*' && event.origin !== iframeOrigin) return;

      if (message.kind === 'event') {
        if (message.event === 'hover') {
          stateRef.current.onHoverData?.(
            message.payload as TradingViewHoverData
          );
        } else if (message.event === 'intervalChanged') {
          const resolution = message.payload?.resolution;
          if (resolution) {
            iframeIntervalChangeRef.current = true;
            stateRef.current.onIntervalChange?.(
              resolutionToInterval(resolution)
            );
          }
        }
        return;
      }

      if (message.kind !== 'request') return;

      const respond = (ok: boolean, result?: any, error?: string) => {
        postToIframe({
          channel: BRIDGE_CHANNEL,
          kind: 'response',
          id: message.id,
          ok,
          result,
          error,
        });
      };

      try {
        switch (message.method) {
          case 'getState':
            respond(true, {
              symbol: stateRef.current.coin,
              resolution: intervalToResolution(stateRef.current.interval),
              theme: stateRef.current.isDarkTheme ? 'dark' : 'light',
              locale: stateRef.current.locale,
              timezone: stateRef.current.timezone,
              pxDecimals: stateRef.current.pxDecimals,
              lineTagInfo: stateRef.current.lineTagInfo,
              widgetConfig: stateRef.current.widgetConfig,
            });
            break;
          case 'onReady':
            respond(true, {
              supports_search: false,
              supports_group_request: false,
              supports_marks: false,
              supports_timescale_marks: false,
              supports_time: false,
              supported_resolutions: SUPPORTED_RESOLUTIONS,
            });
            break;
          case 'resolveSymbol':
            respond(true, {
              name: message.params?.symbol || stateRef.current.coin,
              ticker: message.params?.symbol || stateRef.current.coin,
              description: message.params?.symbol || stateRef.current.coin,
              type: 'crypto',
              session: '24x7',
              timezone: stateRef.current.timezone,
              // exchange: 'Hyperliquid',
              // listed_exchange: 'Hyperliquid',
              minmov: 1,
              pricescale: 10 ** Math.max(stateRef.current.pxDecimals, 0),
              has_intraday: true,
              has_weekly_and_monthly: true,
              supported_resolutions: SUPPORTED_RESOLUTIONS,
              intraday_multipliers: ['1', '5', '15', '30', '60', '240', '480'],
              data_status: 'streaming',
              volume_precision: 2,
            });
            break;
          case 'getBars':
            respond(true, await handleGetBars(message.params as any));
            break;
          case 'subscribeBars':
            respond(true, handleSubscribeBars(message.params as any));
            break;
          case 'unsubscribeBars':
            respond(true, handleUnsubscribeBars(message.params as any));
            break;
          default:
            respond(false, undefined, `Unsupported method: ${message.method}`);
        }
      } catch (error) {
        respond(
          false,
          undefined,
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
      cleanupSubscriptions();
    };
  }, [iframeOrigin]);

  useEffect(() => {
    // Skip if the interval change originated from the TradingView iframe itself
    if (iframeIntervalChangeRef.current) {
      iframeIntervalChangeRef.current = false;
      return;
    }

    // Cancel all active SDK WebSocket subscriptions before switching symbol
    subscriptionsRef.current.forEach((sub) => sub.unsubscribe());
    subscriptionsRef.current.clear();

    postToIframe({
      channel: BRIDGE_CHANNEL,
      kind: 'command',
      command: 'setSymbolInterval',
      payload: {
        symbol: coin,
        resolution: intervalToResolution(interval),
      },
    });
  }, [coin, interval]);

  useEffect(() => {
    postToIframe({
      channel: BRIDGE_CHANNEL,
      kind: 'command',
      command: 'setTheme',
      payload: {
        theme: isDarkTheme ? 'dark' : 'light',
      },
    });
  }, [isDarkTheme]);

  useEffect(() => {
    postToIframe({
      channel: BRIDGE_CHANNEL,
      kind: 'command',
      command: 'setTimezone',
      payload: {
        timezone,
      },
    });
  }, [timezone]);

  useEffect(() => {
    postToIframe({
      channel: BRIDGE_CHANNEL,
      kind: 'command',
      command: 'setLocale',
      payload: {
        locale,
      },
    });
  }, [locale]);

  useEffect(() => {
    postToIframe({
      channel: BRIDGE_CHANNEL,
      kind: 'command',
      command: 'setPriceLines',
      payload: lineTagInfo,
    });
  }, [lineTagInfo]);

  useEffect(() => {
    postToIframe({
      channel: BRIDGE_CHANNEL,
      kind: 'command',
      command: 'setPriceScale',
      payload: {
        pxDecimals,
      },
    });
  }, [pxDecimals]);

  useEffect(() => {
    postToIframe({
      channel: BRIDGE_CHANNEL,
      kind: 'command',
      command: 'setWidgetConfig',
      payload: widgetConfig || {},
    });
  }, [widgetConfig]);

  return (
    <iframe
      ref={iframeRef}
      src={iframeUrl}
      className={className}
      title="tradingview-advanced-chart"
      style={{
        width: '100%',
        height: '100%',
        border: 0,
      }}
      sandbox="allow-scripts allow-same-origin allow-forms allow-downloads allow-popups"
      allowFullScreen
    />
  );
};
