import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import browser from 'webextension-polyfill';
import type { Candle, CandleSnapshot } from '@rabby-wallet/hyperliquid-sdk';
import { getPerpsSDK } from '../sdkManager';
import { CandleSubscriptionRegistry } from '../candleSubscriptions';
import type { CandleBar as TVBar, WeeklyHistoryState } from '../weeklyCandles';
import {
  aggregateDailyToWeeklyBars,
  getLatestWeeklyHistoryState,
  getMondayUtc,
  seedWeeklyCandleStateFromHistory,
  shouldReplaceWeeklyHistoryState,
  updateWeeklyCandle,
} from '../weeklyCandles';

const BRIDGE_CHANNEL = 'rabby-tradingview-bridge-v1';
const DEFAULT_TRADINGVIEW_URL = process.env.DEBUG
  ? 'https://tradingview-test.vercel.app/'
  : 'https://tradingview.rabby.io/';

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
  symbol: string;
  resolution: string;
  subscribeInterval: PerpsInterval;
  onCandle: (snapshot: Candle) => void;
  currentWeekBar: TVBar | null;
  lastDailyVolume: { time: number; value: number } | null;
  isWeekly: boolean;
  hasWeeklyHistorySeed: boolean;
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
  tpPrice?: number;
  slPrice?: number;
  liquidationPrice?: number;
  entryPrice?: number;
  currentOrders?: Array<{
    id?: string | number;
    oid?: string | number;
    side?: string;
    orderType?: string;
    triggerType?: string;
    triggerCondition?: string;
    tpslType?: string;
    price?: number;
    limitPx?: number | string;
    triggerPx?: number | string;
    size?: string | number;
    sz?: string | number;
    origSz?: string | number;
    isTrigger?: boolean;
    isTwap?: boolean;
    isPositionTpsl?: boolean;
    reduceOnly?: boolean;
    expectedPnl?: string | number;
    expectedPnlText?: string;
  }>;
  position?: {
    entryPrice?: number;
    avgPrice?: number;
    pnl?: string | number;
    unrealizedPnl?: string | number;
    size?: string | number;
    sz?: string | number;
    szi?: string | number;
    liquidationPrice?: number;
    liquidationPx?: number;
  };
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

const getWeeklyHistoryKey = (symbol: string, resolution: string) =>
  `${symbol.toLowerCase()}:${resolution}`;

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

const isTradingViewExternalUrl = (url?: unknown): url is string => {
  if (typeof url !== 'string') return false;

  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === 'https:' &&
      (parsed.hostname === 'tradingview.com' ||
        parsed.hostname.endsWith('.tradingview.com'))
    );
  } catch (error) {
    return false;
  }
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
  const chartGenerationRef = useRef(0);
  const iframeGenerationRef = useRef(-1);
  const setIframeRef = useCallback((iframe: HTMLIFrameElement | null) => {
    iframeRef.current = iframe;
    if (iframe) {
      iframeGenerationRef.current = chartGenerationRef.current;
    }
  }, []);
  const subscriptionsRef = useRef(
    new CandleSubscriptionRegistry<Candle, BarSubscription>()
  );
  const weeklyHistoryRef = useRef<Map<string, WeeklyHistoryState>>(new Map());
  // Bumped to remount the iframe when the chart never came up at all
  const [chartReloadKey, setChartReloadKey] = useState(0);

  const iframeUrl = useMemo(() => {
    const base = getTradingViewBaseUrl();
    const url = new URL(base);
    url.searchParams.set('source', 'rabby');
    url.searchParams.set('version', process.env.release || '0');
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

  useEffect(() => {
    const handleDocumentPointerDown = (event: PointerEvent) => {
      const target = event.target;
      const iframe = iframeRef.current;
      if (iframe && target instanceof Node && iframe.contains(target)) return;

      postToIframe({
        channel: BRIDGE_CHANNEL,
        kind: 'command',
        command: 'closeDisplayMenu',
      });
    };

    document.addEventListener('pointerdown', handleDocumentPointerDown, true);
    return () => {
      document.removeEventListener(
        'pointerdown',
        handleDocumentPointerDown,
        true
      );
    };
  }, [iframeOrigin]);

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
    const sdk = getPerpsSDK();
    let chartNeedsRecovery = false;
    // The iframe answered at least one bridge message, i.e. its document and
    // script actually loaded.
    let bridgeAlive = false;
    // getBars was answered successfully at least once, i.e. TradingView owns a
    // rendered series.
    let barsLoaded = false;

    const cleanupSubscriptions = () => {
      subscriptionsRef.current.clear();
    };

    const recoverChart = () => {
      // Offline at mount leaves nothing to refresh. Either the host document
      // never loaded (it is served no-cache with no service worker, so there is
      // no bridge to post to), or it loaded but its first getBars failed —
      // TradingView only calls subscribeBars after a successful history
      // response, so that chart has an errored series and no subscription.
      // Remounting the iframe is the only way back for both; the host re-reads
      // symbol/interval/theme through its getState handshake.
      if (!bridgeAlive || !barsLoaded) {
        // Invalidate the old document synchronously. React commits the keyed
        // iframe replacement later, so source===contentWindow alone leaves a
        // window in which old messages can revive the liveness flags.
        chartGenerationRef.current += 1;
        bridgeAlive = false;
        barsLoaded = false;
        cleanupSubscriptions();
        weeklyHistoryRef.current.clear();
        setChartReloadKey((key) => key + 1);
        return;
      }

      // The chart is alive and only missed the candles from the outage: drop
      // its cached bars so it re-requests history through getBars.
      postToIframe({
        channel: BRIDGE_CHANNEL,
        kind: 'command',
        command: 'resetData',
      });
    };

    const handleWebSocketClose = () => {
      // An SDK-level reconnect restores realtime subscriptions, but candle
      // messages do not backfill the intervals missed while disconnected.
      chartNeedsRecovery = true;
    };

    // Recovery is one-shot per outage: 'online' and the SDK reconnect both fire
    // on the same network restore, and whichever lands first consumes the flag.
    // 'online' is kept because the SDK backs off for up to 30s before it
    // reconnects, and the chart does not need the socket to refetch history.
    const handleNetworkRestored = () => {
      if (!chartNeedsRecovery) return;
      chartNeedsRecovery = false;
      recoverChart();
    };

    sdk.ws.on('close', handleWebSocketClose);
    sdk.ws.on('open', handleNetworkRestored);
    window.addEventListener('online', handleNetworkRestored);

    const emitLatestBar = (symbol: string, resolution: string, bar: TVBar) => {
      const current = stateRef.current;
      if (
        symbol !== current.coin ||
        resolutionToInterval(resolution) !== current.interval
      ) {
        return;
      }

      current.onLatestBar?.(toHoverData(bar));
    };

    const handleGetBars = async (
      params: {
        symbol: string;
        resolution: string;
        periodParams?: {
          from?: number;
          to?: number;
        };
      },
      requestSource: MessageEventSource | null,
      requestGeneration: number
    ) => {
      const targetInterval = resolutionToInterval(params.resolution);
      const isWeekly = targetInterval === '1w';
      const fetchInterval: PerpsInterval = isWeekly ? '1d' : targetInterval;
      const fallbackRange = getTimeRange(targetInterval);
      const requestedStart = params.periodParams?.from
        ? params.periodParams.from * 1000
        : fallbackRange.start;
      // A TradingView range can start mid-week. Fetch from that week's Monday
      // so the first weekly candle is never cached with a mid-week open/volume.
      const start = isWeekly
        ? Math.max(0, getMondayUtc(requestedStart))
        : requestedStart;
      const end = params.periodParams?.to
        ? params.periodParams.to * 1000
        : fallbackRange.end;

      const snapshot = await sdk.info.candleSnapshot(
        params.symbol,
        fetchInterval,
        start,
        end
      );
      // chartReloadKey replaces the iframe without replacing this effect. An
      // HTTP request from the detached document can therefore finish after the
      // new bridge has started and reuse one of its request ids. Do not let the
      // old request mutate weekly state or answer the new document.
      if (
        requestGeneration !== chartGenerationRef.current ||
        requestGeneration !== iframeGenerationRef.current ||
        requestSource !== iframeRef.current?.contentWindow
      ) {
        return null;
      }

      const dailyBars = parseBars(snapshot);
      const bars = isWeekly ? aggregateDailyToWeeklyBars(dailyBars) : dailyBars;
      if (isWeekly) {
        const historyState = getLatestWeeklyHistoryState(bars, dailyBars);
        const historyKey = getWeeklyHistoryKey(
          params.symbol,
          params.resolution
        );
        const cachedHistoryState = weeklyHistoryRef.current.get(historyKey);
        // TradingView can paginate older ranges after loading the latest bars,
        // and those requests may finish out of order. Never let an older/empty
        // page evict the current-week seed needed by the realtime aggregator.
        if (
          historyState &&
          shouldReplaceWeeklyHistoryState(cachedHistoryState, historyState)
        ) {
          weeklyHistoryRef.current.set(historyKey, historyState);
        }

        // resetData() reloads TradingView history without replacing the SDK
        // subscription object. Keep the mutable weekly aggregation state in
        // sync so the next daily candle cannot overwrite refreshed history
        // with the pre-disconnect week snapshot.
        const historySeed = weeklyHistoryRef.current.get(historyKey);
        const currentWeekStart = getMondayUtc(Date.now());
        subscriptionsRef.current.forEachSubscriber((subscription) => {
          if (
            !historySeed ||
            historySeed.currentWeekBar.time !== currentWeekStart ||
            !subscription.isWeekly ||
            getWeeklyHistoryKey(
              subscription.symbol,
              subscription.resolution
            ) !== historyKey
          ) {
            return;
          }

          subscription.hasWeeklyHistorySeed = seedWeeklyCandleStateFromHistory(
            subscription,
            historySeed,
            currentWeekStart
          );
        });
      }
      if (bars.length) {
        emitLatestBar(params.symbol, params.resolution, bars[bars.length - 1]);
      }
      barsLoaded = true;
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
      const targetInterval = resolutionToInterval(params.resolution);
      const isWeekly = targetInterval === '1w';
      const subscribeInterval: PerpsInterval = isWeekly ? '1d' : targetInterval;
      const weeklyHistoryKey = getWeeklyHistoryKey(
        params.symbol,
        params.resolution
      );
      const state: BarSubscription = {
        symbol: params.symbol,
        resolution: params.resolution,
        subscribeInterval,
        currentWeekBar: null,
        lastDailyVolume: null,
        isWeekly,
        hasWeeklyHistorySeed: false,
        onCandle: (snapshot) => {
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
            emitLatestBar(state.symbol, state.resolution, dayBar);
            return;
          }

          const currentWeekStart = getMondayUtc(dayBar.time);
          if (state.currentWeekBar?.time !== currentWeekStart) {
            state.hasWeeklyHistorySeed = false;
          }
          if (!state.currentWeekBar || !state.hasWeeklyHistorySeed) {
            state.hasWeeklyHistorySeed = seedWeeklyCandleStateFromHistory(
              state,
              weeklyHistoryRef.current.get(weeklyHistoryKey),
              dayBar.time
            );
          }

          // History and subscribeBars are independent bridge requests. If the
          // seed is missing or an older pagination request won the race,
          // updateWeeklyCandle starts a partial current-week bar rather than
          // freezing latest-price updates while waiting for history forever.
          const currentWeekBar = updateWeeklyCandle(state, dayBar);
          postToIframe({
            channel: BRIDGE_CHANNEL,
            kind: 'event',
            event: 'realtimeBar',
            payload: {
              subscriberUID: params.subscriberUID,
              bar: currentWeekBar,
            },
          });
          emitLatestBar(state.symbol, state.resolution, currentWeekBar);
        },
      };

      subscriptionsRef.current.subscribe(
        params.subscriberUID,
        state,
        (onCandle) =>
          sdk.ws.subscribeToCandles(params.symbol, subscribeInterval, onCandle)
      );
      return { ok: true };
    };

    const handleUnsubscribeBars = (params: { subscriberUID: string }) => {
      subscriptionsRef.current.unsubscribe(params.subscriberUID);
      return { ok: true };
    };

    const handleMessage = async (event: MessageEvent) => {
      const message = event.data as BridgeMessage;
      if (!message || message.channel !== BRIDGE_CHANNEL) return;
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (iframeOrigin !== '*' && event.origin !== iframeOrigin) return;
      const messageGeneration = chartGenerationRef.current;
      if (iframeGenerationRef.current !== messageGeneration) return;

      bridgeAlive = true;

      if (message.kind === 'event') {
        if (message.event === 'hover') {
          stateRef.current.onHoverData?.(
            message.payload as TradingViewHoverData
          );
        } else if (message.event === 'intervalChanged') {
          const resolution = message.payload?.resolution;
          if (resolution) {
            stateRef.current.onIntervalChange?.(
              resolutionToInterval(resolution)
            );
          }
        } else if (message.event === 'openExternalUrl') {
          const url = message.payload?.url;
          if (isTradingViewExternalUrl(url)) {
            browser.tabs.create({ active: true, url }).catch(() => {
              window.open(url, '_blank', 'noopener,noreferrer');
            });
          }
        }
        return;
      }

      if (message.kind !== 'request') return;

      const responseTarget = event.source as Window | null;
      const respond = (ok: boolean, result?: any, error?: string) => {
        responseTarget?.postMessage(
          {
            channel: BRIDGE_CHANNEL,
            kind: 'response',
            id: message.id,
            ok,
            result,
            error,
          },
          iframeOrigin
        );
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
            {
              const result = await handleGetBars(
                message.params as any,
                event.source,
                messageGeneration
              );
              if (result) {
                respond(true, result);
              } else {
                respond(false, undefined, 'Stale chart request');
              }
            }
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
      window.removeEventListener('online', handleNetworkRestored);
      sdk.ws.off('close', handleWebSocketClose);
      sdk.ws.off('open', handleNetworkRestored);
      cleanupSubscriptions();
    };
  }, [iframeOrigin]);

  useEffect(() => {
    // Sent unconditionally, and without touching the SDK subscriptions.
    //
    // Nothing here may depend on a record of what the iframe is showing: a
    // command can fail to land (TradingView drops setSymbol/setResolution
    // issued while a load is in flight), and any such record would then be
    // wrong forever, suppressing the command that would recover the chart.
    // The iframe drops a command matching what it already shows, so a repeat
    // costs nothing. If TradingView does reopen the logical series, the candle
    // registry replaces the same UID without bouncing its physical channel and
    // refcounts any 1D/1W channel shared by different UIDs.
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
      key={chartReloadKey}
      ref={setIframeRef}
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
