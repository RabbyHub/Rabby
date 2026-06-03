/** Perps floating widget — shared broadcast protocol between SW and content-script. */

import type { PerpsQuoteAsset } from '@/utils/perps/quoteAsset';

export interface PerpsLivePosition {
  /** Main dex `BTC`, builder dex `xyz:Sliver`; globally unique, safe to use as React key */
  coin: string;
  quoteAsset: PerpsQuoteAsset;
  /** e.g. `SHIB/USDC`, rendered as-is */
  displayName: string;
  tokenLabel: string;
  logoUrl: string;
  direction: 'long' | 'short';
  leverage: { type: 'cross' | 'isolated'; value: number };
  szi: string;
  entryPx: string;
  positionValue: string;
  /** Derived from positionValue / |szi| (protocol-equivalent), string precision aligned to entryPx */
  markPx: string;
  unrealizedPnl: string;
  returnOnEquity: string;
  marginUsed: string;
  liquidationPx: string | null;
  /** Decimal form: 0.123 = +12.3%. null while the kline first open is still in flight */
  dayChangePct: number | null;
  /** 24h × 1h close prices; empty = first fetch still pending */
  sparkline: number[];
}

export interface PerpsLiveSnapshot {
  address: string;
  accountValue: string;
  totalUnrealizedPnl: string;
  totalMarginUsed: string;
  /** Full list — UI sorts + slices on its own */
  positions: PerpsLivePosition[];
  ts: number;
}

export type PerpsLiveWsState = 'connecting' | 'open' | 'closed';

export type PerpsLiveBroadcast =
  | { type: 'SNAPSHOT'; snapshot: PerpsLiveSnapshot }
  /** Stream halted. Client must NOT hard-teardown — App.tsx hides via positions.length so future SNAPSHOT can revive */
  | { type: 'CLEARED' }
  | { type: 'WS_STATE'; state: PerpsLiveWsState };

/** Reserved for client→SW snapshot re-fetch request; unused in v1 */
export type PerpsLiveRequest = { type: 'REQUEST_LATEST' };

export const PERPS_LIVE_PORT_NAME = 'perps-live';
