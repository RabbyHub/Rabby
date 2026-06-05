/**
 * Perps floating widget — Service Worker core.
 *
 * Lifecycle is on-demand: WS subscribes when the first content-script port attaches and
 * stops 30s after the last one disconnects (grace covers tab-switch flicker).
 */

import {
  HyperliquidSDK,
  Meta,
  WsAllClearinghouseStates,
  ClearinghouseState,
  AssetPosition,
  CandleSnapshot,
  PerpDex,
} from '@rabby-wallet/hyperliquid-sdk';
import type { Runtime } from 'webextension-polyfill';
import type { PerpTopTokenV3 } from '@rabby-wallet/rabby-api/dist/types';
import eventBus from '@/eventBus';
import { EVENTS } from '@/constant';
import {
  PerpsLiveBroadcast,
  PerpsLivePosition,
  PerpsLiveSnapshot,
  PerpsLiveWsState,
  PERPS_LIVE_PORT_NAME,
} from '@/utils/message/perpsLive';
import { getHyperliquidCoinLogoUrl } from '@/utils/perps/coinLogo';
import {
  PerpsQuoteAsset,
  getQuoteAssetFromMeta,
} from '@/utils/perps/quoteAsset';
import openapiService from './openapi';
import perpsService from './perps';
import preferenceService from './preference';

type Port = Runtime.Port;
/** Cross-env timer handle (NodeJS.Timeout in @types/node, number in DOM lib) */
type TimerHandle = ReturnType<typeof setTimeout>;

/** Coalesce WS push bursts; active markets can push 5–10×/s */
const REBUILD_DEBOUNCE_MS = 150;
/** Keep WS alive across tab-switch flicker after the last port disconnects */
const GRACE_STOP_MS = 30 * 1000;
const WS_RETRY_MS = 5 * 1000;
/** Aligned to the 15m candle period: each refresh picks up one newly closed candle (the live tail is driven by ctx markPx, not this) */
const KLINE_REFRESH_MS = 15 * 60 * 1000;
const KLINE_LOOKBACK_MS = 24 * 60 * 60 * 1000;
/** 15m over 24h ≈ 96 points → ~1.3px/point on the 125px sparkline (1h/24pt looked jagged) */
const KLINE_INTERVAL = '15m';
/** UI only renders top-3 cards */
const TOP_N_KLINE = 3;
/** Min gap between WS-driven (on-demand) kline kicks; bounds retries if a fetch keeps failing */
const ON_DEMAND_KLINE_COOLDOWN_MS = 5 * 1000;
const CATALOG_REFRESH_MS = 24 * 60 * 60 * 1000;

interface KlineCacheEntry {
  prices: number[];
  fetchedAt: number;
}

/** Live market ctx per coin from the activeAssetCtx WS — source of truth for markPx + dayChange */
interface AssetCtxEntry {
  /** Server-formatted markPx string (rendered as-is, no re-derive) */
  markPx: string;
  markPxNum: number;
  /** Price 24h ago; dayChange = (markPx - prevDayPx) / prevDayPx */
  prevDayPx: number;
}

type DexClearinghousePair = [string, ClearinghouseState];

/** Avoid float noise like `1.7000000000001` in the reverse-derived markPx */
function alignDecimals(value: number, refStr: string | undefined): string {
  if (!Number.isFinite(value)) return '0';
  if (!refStr) return value.toFixed(8).replace(/\.?0+$/, '');
  const dotIdx = refStr.indexOf('.');
  if (dotIdx === -1) return Math.round(value).toString();
  const decimals = Math.min(refStr.length - dotIdx - 1, 8);
  return value.toFixed(decimals);
}

/**
 * Append the live markPx as the trailing sparkline point so the tail tracks price
 * in real time. Appends (not replaces) to avoid assuming the last candle is the
 * in-progress one; the extra point sits next to a near-equal close, so it's invisible.
 */
function appendLivePrice(
  prices: number[] | undefined,
  livePx: number
): number[] {
  const base = prices ?? [];
  if (base.length === 0 || !Number.isFinite(livePx) || livePx <= 0) return base;
  return [...base, livePx];
}

class PerpsLiveService {
  private sdk: HyperliquidSDK | null = null;
  private wsClearinghouse: { unsubscribe: () => void } | null = null;

  private ports = new Set<Port>();
  private latest: PerpsLiveSnapshot | null = null;
  /** Cached so attachPort can replay it; late-joiners would otherwise miss the one-shot 'open' */
  private currentWsState: PerpsLiveWsState = 'closed';
  private currentAddress: string | null = null;

  private rawDexStates: DexClearinghousePair[] = [];

  private pendingRebuildTimer: TimerHandle | null = null;
  private graceStopTimer: TimerHandle | null = null;
  private wsRetryTimer: TimerHandle | null = null;
  private klineTimer: TimerHandle | null = null;

  private klineCache = new Map<string, KlineCacheEntry>();
  /** True while a refreshKlines fetch is awaiting; blocks overlapping runs */
  private klineRefreshing = false;
  /** Last on-demand kline kick timestamp, for ON_DEMAND_KLINE_COOLDOWN_MS rate-limiting */
  private lastKlineKickAt = 0;

  /** Live markPx + prevDayPx per coin, keyed by Hyperliquid coin string */
  private assetCtxCache = new Map<string, AssetCtxEntry>();
  /** Per-coin activeAssetCtx WS subscriptions, reconciled to the position set */
  private assetCtxSubs = new Map<string, { unsubscribe: () => void }>();

  /** Keyed by Hyperliquid coin string. DeBank's `t.name` is already in that format — `t.dex_id` is redundant */
  private tokenCatalog = new Map<string, PerpTopTokenV3>();
  private catalogRefreshTimer: TimerHandle | null = null;

  /** dex prefix → quoteAsset; main dex uses '' as key */
  private dexLookup = new Map<string, { quoteAsset: PerpsQuoteAsset }>();

  private booted = false;

  async boot(): Promise<void> {
    if (this.booted) return;
    this.booted = true;
    console.log('[perpsLive] boot');

    this.sdk = new HyperliquidSDK({
      isTestnet: false,
      timeout: 10000,
      wsConfig: { autoReconnect: true },
    });

    eventBus.addEventListener(
      EVENTS.PERPS.WIDGET_ACCOUNT_CHANGED,
      (addr: string | null) => {
        console.log('[perpsLive] accountChange →', addr);
        this.applyAddress(addr);
      }
    );
    eventBus.addEventListener(EVENTS.PERPS.WIDGET_ENABLED_CHANGED, () => {
      console.log('[perpsLive] enabledChange');
      this.applyAddress(this.deriveCurrentAddress());
    });

    // 2s ceiling so a slow REST doesn't block SW boot; the pending Promise.all
    // keeps running and eventually fills the maps anyway.
    await Promise.race([
      Promise.all([this.refreshTokenCatalog(), this.refreshDexLookup()]),
      new Promise<void>((r) => setTimeout(r, 2000)),
    ]);

    this.catalogRefreshTimer = setInterval(() => {
      this.refreshTokenCatalog();
      this.refreshDexLookup();
    }, CATALOG_REFRESH_MS);
  }

  attachPort(port: Port): void {
    this.ports.add(port);
    console.log('[perpsLive] attachPort, ports.size now:', this.ports.size);
    this.cancelGraceStop();

    if (this.ports.size === 1 && !this.currentAddress) {
      this.applyAddress(this.deriveCurrentAddress());
    }

    port.onDisconnect.addListener(() => {
      this.ports.delete(port);
      console.log(
        '[perpsLive] port disconnect, ports.size now:',
        this.ports.size
      );
      if (this.ports.size === 0) {
        this.scheduleGraceStop();
      }
    });

    this.send(port, { type: 'WS_STATE', state: this.currentWsState });
    if (this.latest) {
      this.send(port, { type: 'SNAPSHOT', snapshot: this.latest });
    }
  }

  private deriveCurrentAddress(): string | null {
    // Narrow cast — exposing a public getter on perpsService would widen its API surface.
    const typed = (perpsService as unknown) as {
      store?: { currentAccount?: { address?: string } | null };
    };
    const addr = typed.store?.currentAccount?.address;
    return typeof addr === 'string' ? addr : null;
  }

  private applyAddress(addr: string | null): void {
    const enabled = preferenceService.getPerpsWidgetEnabled();
    const hasPort = this.ports.size > 0 || this.graceStopTimer != null;
    const target = enabled && hasPort ? addr : null;

    if (target === this.currentAddress) return;

    if (target) {
      console.log('[perpsLive] applyAddress: stream →', target);
      this.startStream(target);
    } else {
      console.log('[perpsLive] applyAddress: stop');
      this.stopStream();
      this.currentAddress = null;
      this.latest = null;
      this.broadcast({ type: 'CLEARED' });
    }
  }

  private startStream(address: string): void {
    this.stopStream();
    this.broadcastWsState('connecting');

    if (!this.sdk) {
      // Defensive — boot() constructs sdk synchronously.
      console.warn('[perpsLive] SDK not ready, retrying soon');
      this.scheduleWsRetry(address);
      return;
    }
    const sdk = this.sdk;

    try {
      this.wsClearinghouse = sdk.ws.subscribeToAllDexsClearinghouseState(
        address,
        (data) => this.onAllDexsClearinghouseStates(data)
      );

      this.currentAddress = address;
      this.broadcastWsState('open');
      console.log('[perpsLive] ws open (all dexs) for', address);
    } catch (err) {
      console.warn('[perpsLive] ws subscribe failed, retry in 5s', err);
      this.broadcastWsState('closed');
      this.scheduleWsRetry(address);
      return;
    }

    // No timer kickoff here — first WS push in onAllDexsClearinghouseStates triggers
    // refreshKlines, which self-schedules subsequent runs.
  }

  private scheduleWsRetry(address: string): void {
    if (this.wsRetryTimer != null) return;
    this.wsRetryTimer = setTimeout(() => {
      this.wsRetryTimer = null;
      const enabled = preferenceService.getPerpsWidgetEnabled();
      const hasPort = this.ports.size > 0;
      if (!enabled || !hasPort) return;
      const fresh = this.deriveCurrentAddress();
      if (fresh !== address) return;
      this.startStream(address);
    }, WS_RETRY_MS);
  }

  private stopStream(): void {
    if (this.wsClearinghouse) {
      try {
        this.wsClearinghouse.unsubscribe();
      } catch {
        /* ignore */
      }
      this.wsClearinghouse = null;
    }

    // WS disconnects but SDK stays — refreshDexLookup and the next startStream both reuse it.
    if (this.sdk) {
      try {
        this.sdk.disconnectWebSocket();
      } catch {
        /* ignore */
      }
    }
    if (this.klineTimer != null) {
      clearTimeout(this.klineTimer);
      this.klineTimer = null;
    }
    if (this.wsRetryTimer != null) {
      clearTimeout(this.wsRetryTimer);
      this.wsRetryTimer = null;
    }
    if (this.pendingRebuildTimer != null) {
      clearTimeout(this.pendingRebuildTimer);
      this.pendingRebuildTimer = null;
    }
    // tokenCatalog / dexLookup intentionally retained across accounts.
    this.clearAssetCtxSubscriptions();
    this.rawDexStates = [];
    this.klineCache.clear();
    this.klineRefreshing = false;
    this.lastKlineKickAt = 0;
    this.broadcastWsState('closed');
  }

  private scheduleGraceStop(): void {
    if (this.graceStopTimer != null) return;
    this.graceStopTimer = setTimeout(() => {
      this.graceStopTimer = null;
      if (this.ports.size === 0) {
        console.log('[perpsLive] grace stop fired (no ports), halting stream');
        this.applyAddress(null);
      }
    }, GRACE_STOP_MS);
  }

  private cancelGraceStop(): void {
    if (this.graceStopTimer != null) {
      clearTimeout(this.graceStopTimer);
      this.graceStopTimer = null;
    }
  }

  private onAllDexsClearinghouseStates(data: WsAllClearinghouseStates): void {
    const states: DexClearinghousePair[] = Array.isArray(
      data?.clearinghouseStates
    )
      ? data.clearinghouseStates
      : [];
    const wasEmpty = this.rawDexStates.length === 0;
    this.rawDexStates = states;

    if (states.length === 0) {
      // No live perps state (e.g. all positions closed). Drop the cached snapshot
      // and notify content scripts so stale positions/PnL aren't left on screen.
      this.clearAssetCtxSubscriptions();
      if (this.latest !== null) {
        this.latest = null;
        this.broadcast({ type: 'CLEARED' });
      }
      return;
    }

    this.syncAssetCtxSubscriptions();
    this.scheduleRebuild();
    if (wasEmpty) {
      // First data for this account — prime klines for the initial top-N.
      this.refreshKlines();
    } else {
      // A position may have newly entered top-N
      this.maybeFetchMissingKlines();
    }
  }

  private async maybeFetchMissingKlines(): Promise<void> {
    if (!this.currentAddress || !this.sdk || this.klineRefreshing) return;
    const now = Date.now();
    if (now - this.lastKlineKickAt < ON_DEMAND_KLINE_COOLDOWN_MS) return;
    const address = this.currentAddress;
    const missing = this.getTopCoins(TOP_N_KLINE).filter(
      (coin) => !this.klineCache.has(coin)
    );
    if (missing.length === 0) return;

    this.lastKlineKickAt = now;
    this.klineRefreshing = true;
    try {
      await this.fetchKlinesFor(missing, address);
    } finally {
      this.klineRefreshing = false;
    }
    this.scheduleRebuild();
  }

  /** Flatten a dex state's assetPositions to its non-empty position rows. */
  private extractPositions(
    state: ClearinghouseState
  ): AssetPosition['position'][] {
    return (state?.assetPositions ?? [])
      .map((ap: AssetPosition) => ap?.position)
      .filter(Boolean);
  }

  private getTopCoins(n: number): string[] {
    const candidates: { coin: string; absValue: number }[] = [];
    for (const [, state] of this.rawDexStates) {
      for (const p of this.extractPositions(state)) {
        candidates.push({
          coin: p.coin,
          absValue: Math.abs(Number(p.positionValue || 0)),
        });
      }
    }
    candidates.sort((a, b) => b.absValue - a.absValue);
    return candidates.slice(0, n).map(({ coin }) => coin);
  }

  /** Distinct coins across all open positions (markPx/dayChange are needed for each). */
  private getPositionCoins(): string[] {
    const coins = new Set<string>();
    for (const [, state] of this.rawDexStates) {
      for (const p of this.extractPositions(state)) {
        if (p.coin) coins.add(p.coin);
      }
    }
    return Array.from(coins);
  }

  /** Reconcile per-coin activeAssetCtx subscriptions to the current position set. */
  private syncAssetCtxSubscriptions(): void {
    if (!this.sdk) return;
    const sdk = this.sdk;
    const needed = new Set(this.getPositionCoins());

    // Subscribe coins newly entered.
    for (const coin of needed) {
      if (this.assetCtxSubs.has(coin)) continue;
      try {
        const sub = sdk.ws.subscribeToActiveAssetCtx(coin, (data) => {
          // The SDK fans every activeAssetCtx push to ALL ctx callbacks, so each
          // closure must keep only its own coin's data.
          if (!data || data.coin !== coin) return;
          const markPxNum = Number(data.ctx?.markPx);
          if (!Number.isFinite(markPxNum)) return;
          const prevDayPx = Number(data.ctx?.prevDayPx);
          this.assetCtxCache.set(coin, {
            markPx: data.ctx.markPx,
            markPxNum,
            prevDayPx: Number.isFinite(prevDayPx) ? prevDayPx : 0,
          });
          this.scheduleRebuild();
        });
        this.assetCtxSubs.set(coin, sub);
      } catch (err) {
        console.warn('[perpsLive] activeAssetCtx subscribe failed', coin, err);
      }
    }

    // Unsubscribe coins no longer held.
    for (const coin of Array.from(this.assetCtxSubs.keys())) {
      if (needed.has(coin)) continue;
      try {
        this.assetCtxSubs.get(coin)?.unsubscribe();
      } catch {
        /* ignore */
      }
      this.assetCtxSubs.delete(coin);
      this.assetCtxCache.delete(coin);
    }
  }

  private clearAssetCtxSubscriptions(): void {
    for (const sub of this.assetCtxSubs.values()) {
      try {
        sub.unsubscribe();
      } catch {
        /* ignore */
      }
    }
    this.assetCtxSubs.clear();
    this.assetCtxCache.clear();
  }

  private scheduleRebuild(): void {
    if (this.pendingRebuildTimer != null) return;
    this.pendingRebuildTimer = setTimeout(() => {
      this.pendingRebuildTimer = null;
      this.rebuildAndBroadcast();
    }, REBUILD_DEBOUNCE_MS);
  }

  private rebuildAndBroadcast(): void {
    if (!this.currentAddress || this.rawDexStates.length === 0) return;
    const snapshot = this.buildSnapshot(this.currentAddress);
    this.latest = snapshot;
    this.broadcast({ type: 'SNAPSHOT', snapshot });
  }

  private buildSnapshot(address: string): PerpsLiveSnapshot {
    const positions: PerpsLivePosition[] = [];
    let accountValueSum = 0;
    let totalMarginUsedSum = 0;
    let totalPnlSum = 0;

    for (const [, state] of this.rawDexStates) {
      const summary = state?.marginSummary;
      accountValueSum += Number(summary?.accountValue ?? 0);
      totalMarginUsedSum += Number(summary?.totalMarginUsed ?? 0);

      for (const p of this.extractPositions(state)) {
        const szi = Number(p.szi || 0);
        const absSzi = Math.abs(szi);

        // markPx + dayChange come from the live activeAssetCtx WS subscription.
        // Reverse-derive (positionValue / |szi|) only as a transient fallback,
        // before this coin's first ctx push arrives, so the price isn't blank.
        const ctxEntry = this.assetCtxCache.get(p.coin);
        const derivedMarkPx =
          absSzi > 0 ? Number(p.positionValue || 0) / absSzi : 0;
        const markPxNum = ctxEntry ? ctxEntry.markPxNum : derivedMarkPx;
        const markPxStr = ctxEntry
          ? ctxEntry.markPx
          : alignDecimals(derivedMarkPx, p.entryPx);

        const prevDayPx = ctxEntry?.prevDayPx ?? 0;
        const dayChangePct =
          prevDayPx > 0 ? (markPxNum - prevDayPx) / prevDayPx : null;

        const klineEntry = this.klineCache.get(p.coin);

        const tokenInfo = this.tokenCatalog.get(p.coin);
        const colonIdx = p.coin.indexOf(':');
        const dexPrefix = colonIdx === -1 ? '' : p.coin.slice(0, colonIdx);
        const quoteAsset = this.dexLookup.get(dexPrefix)?.quoteAsset ?? 'USDC';
        const tokenLabel =
          tokenInfo?.display_name?.trim() || tokenInfo?.name || p.coin;
        const logoUrl =
          tokenInfo?.full_logo_url || getHyperliquidCoinLogoUrl(p.coin);

        positions.push({
          coin: p.coin,
          quoteAsset,
          displayName: tokenLabel,
          tokenLabel,
          logoUrl,
          direction: szi >= 0 ? 'long' : 'short',
          leverage: {
            type: p.leverage?.type ?? 'cross',
            value: Number(p.leverage?.value ?? 1),
          },
          szi: p.szi,
          entryPx: p.entryPx ?? '0',
          positionValue: p.positionValue,
          markPx: markPxStr,
          unrealizedPnl: p.unrealizedPnl,
          returnOnEquity: p.returnOnEquity,
          marginUsed: p.marginUsed,
          liquidationPx: p.liquidationPx ?? null,
          dayChangePct,
          sparkline: appendLivePrice(klineEntry?.prices, markPxNum),
        });

        totalPnlSum += Number(p.unrealizedPnl || 0);
      }
    }

    return {
      address,
      accountValue: accountValueSum.toString(),
      totalUnrealizedPnl: totalPnlSum.toString(),
      totalMarginUsed: totalMarginUsedSum.toString(),
      positions,
      ts: Date.now(),
    };
  }

  private async refreshKlines(): Promise<void> {
    if (!this.currentAddress || !this.sdk) return;

    if (this.klineTimer != null) {
      clearTimeout(this.klineTimer);
    }
    this.klineTimer = setTimeout(() => this.refreshKlines(), KLINE_REFRESH_MS);

    if (this.rawDexStates.length === 0) return;
    // Guard against overlapping runs (timer vs WS-driven fetch within the same window).
    if (this.klineRefreshing) return;
    this.klineRefreshing = true;

    const address = this.currentAddress;
    const top = this.getTopCoins(TOP_N_KLINE);
    try {
      await this.fetchKlinesFor(top, address);
      // Drop cache entries whose coin dropped out of top-N (e.g. user closed a position).
      const keepKeys = new Set(top);
      for (const cached of Array.from(this.klineCache.keys())) {
        if (!keepKeys.has(cached)) this.klineCache.delete(cached);
      }
    } finally {
      this.klineRefreshing = false;
    }

    this.scheduleRebuild();
  }

  /** Fetch + cache 1h candles for the given coins. */
  private async fetchKlinesFor(
    coins: string[],
    address: string
  ): Promise<void> {
    if (coins.length === 0 || !this.sdk) return;
    const sdk = this.sdk;
    const now = Date.now();
    const start = now - KLINE_LOOKBACK_MS;
    await Promise.allSettled(
      coins.map(async (coin) => {
        try {
          const candles = await sdk.info.candleSnapshot(
            coin,
            KLINE_INTERVAL,
            start,
            now
          );
          // Race guard: stream may have stopped/switched while awaiting; don't write stale data.
          if (this.currentAddress !== address) return;
          const arr: CandleSnapshot = candles;
          const prices = arr.map((c) => Number(c.c)).filter(Number.isFinite);
          this.klineCache.set(coin, { prices, fetchedAt: now });
        } catch (err) {
          console.warn('[perpsLive] candleSnapshot failed', coin, err);
        }
      })
    );
  }

  private async refreshTokenCatalog(): Promise<void> {
    try {
      const list = await openapiService.getPerpTopTokenListV3?.({
        dex_id: 'all',
      });
      if (!Array.isArray(list)) return;
      this.tokenCatalog.clear();
      for (const t of list) {
        if (t?.name) {
          this.tokenCatalog.set(t.name, t);
        }
      }
      console.log(
        '[perpsLive] tokenCatalog refreshed, size:',
        this.tokenCatalog.size
      );
      this.scheduleRebuild();
    } catch (err) {
      console.warn('[perpsLive] refreshTokenCatalog failed', err);
    }
  }

  /** perpDexs and allMetas are index-aligned; perpDexs[i] === null marks the main dex (key '') */
  private async refreshDexLookup(): Promise<void> {
    if (!this.sdk) return;
    const sdk = this.sdk;
    try {
      const [allMetas, perpDexs] = await Promise.all([
        sdk.info.getPerpsAllMetas(),
        sdk.info.getPerpDexs(),
      ]);
      this.dexLookup.clear();
      (allMetas ?? []).forEach((meta: Meta, idx: number) => {
        const dexEntry: PerpDex | null = (perpDexs ?? [])[idx] ?? null;
        const dexId = dexEntry == null ? '' : dexEntry.name ?? '';
        this.dexLookup.set(dexId, { quoteAsset: getQuoteAssetFromMeta(meta) });
      });
      console.log(
        '[perpsLive] dexLookup refreshed, size:',
        this.dexLookup.size
      );
      this.scheduleRebuild();
    } catch (err) {
      console.warn('[perpsLive] refreshDexLookup failed', err);
    }
  }

  private broadcast(msg: PerpsLiveBroadcast): void {
    for (const port of this.ports) {
      this.send(port, msg);
    }
  }

  private broadcastWsState(state: PerpsLiveWsState): void {
    if (this.currentWsState === state) return;
    this.currentWsState = state;
    this.broadcast({ type: 'WS_STATE', state });
  }

  private send(port: Port, msg: PerpsLiveBroadcast): void {
    try {
      port.postMessage(msg);
    } catch {
      /* port already gone; onDisconnect handles cleanup */
    }
  }
}

export const perpsLive = new PerpsLiveService();
export default perpsLive;
