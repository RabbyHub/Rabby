/**
 * Bookkeeping for the TradingView datafeed's candle subscriptions.
 *
 * The Hyperliquid SDK keys its candle channels by coin+interval and does not
 * refcount them: every unsubscribe() sends an unsubscribe frame that stops the
 * server pushing that channel to *every* listener on it. TradingView, meanwhile,
 * does not guarantee it retires the outgoing subscriberUID before it opens the
 * replacement, so two UIDs can briefly share one channel — and the late
 * unsubscribe then silences the live one, leaving the chart with a subscriber
 * that never receives another bar.
 *
 * These helpers keep at most one entry per channel, and retire a collision
 * *before* its replacement is opened so the frames reach the server in
 * unsubscribe → subscribe order.
 */

export interface CandleChannel {
  symbol: string;
  /** Interval actually sent to the SDK — weekly bars are built from daily. */
  subscribeInterval: string;
}

export interface CandleSubscriptionEntry extends CandleChannel {
  unsubscribe: () => void;
}

export const sharesCandleChannel = (a: CandleChannel, b: CandleChannel) =>
  a.symbol === b.symbol && a.subscribeInterval === b.subscribeInterval;

/**
 * The SDK dispatches candle frames by channel *type*, so every candle listener
 * sees every subscribed channel's bars. While two channels overlap — the
 * outgoing interval has not been retired yet and its replacement is already
 * open — a listener would otherwise forward the other channel's bar as its own.
 *
 * Frames that do not carry `s`/`i` are let through: a listener starved by
 * missing metadata would freeze the chart, which is the very failure this
 * guards against. Only a frame that positively names another channel is
 * dropped.
 */
export const isCandleForChannel = (
  candle: { s?: string; i?: string },
  channel: CandleChannel
): boolean => {
  if (candle.s && candle.s !== channel.symbol) return false;
  if (candle.i && candle.i !== channel.subscribeInterval) return false;

  return true;
};

/**
 * Retire whatever already holds `channel` (or `subscriberUID`), then open the
 * replacement through `open` and register it. `open` runs after the teardown so
 * that a replacement on the same channel re-subscribes behind its own
 * unsubscribe frame instead of being cancelled by it.
 */
export const openCandleSubscription = <T extends CandleSubscriptionEntry>(
  subscriptions: Map<string, T>,
  subscriberUID: string,
  channel: CandleChannel,
  open: () => T
): T => {
  subscriptions.forEach((entry, uid) => {
    if (uid !== subscriberUID && !sharesCandleChannel(entry, channel)) return;

    entry.unsubscribe();
    subscriptions.delete(uid);
  });

  const entry = open();
  subscriptions.set(subscriberUID, entry);
  return entry;
};

/**
 * Retire one subscriberUID. A UID already superseded by
 * {@link openCandleSubscription} is gone from the map, so this is a no-op for it
 * — which is the point: unsubscribing it again would close the channel its
 * replacement is still listening on.
 */
export const closeCandleSubscription = <T extends CandleSubscriptionEntry>(
  subscriptions: Map<string, T>,
  subscriberUID: string
): void => {
  const entry = subscriptions.get(subscriberUID);
  if (!entry) return;

  entry.unsubscribe();
  subscriptions.delete(subscriberUID);
};

export const closeAllCandleSubscriptions = <T extends CandleSubscriptionEntry>(
  subscriptions: Map<string, T>
): void => {
  subscriptions.forEach((entry) => entry.unsubscribe());
  subscriptions.clear();
};
