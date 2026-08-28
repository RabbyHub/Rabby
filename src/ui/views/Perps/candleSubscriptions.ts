/**
 * Bookkeeping for the TradingView datafeed's logical candle subscriptions.
 *
 * TradingView identifies a series by symbol+display resolution, while the
 * Hyperliquid channel is symbol+SDK interval. Those identities are not
 * one-to-one: Rabby's weekly series is aggregated from the daily channel, so
 * `BTC/1D` and `BTC/1W` both ride `BTC/1d`.
 *
 * The SDK cannot safely open that physical channel twice. Its active channel
 * map is not refcounted, and either duplicate's unsubscribe frame stops the
 * server stream for both. The registry below therefore owns exactly one SDK
 * subscription per physical channel and fans each candle out to every logical
 * TradingView subscriber riding it.
 */

export interface CandleChannel {
  symbol: string;
  /** Interval actually sent to the SDK — weekly bars are built from daily. */
  subscribeInterval: string;
}

export interface CandleSubscriptionEntry<TCandle> extends CandleChannel {
  onCandle: (candle: TCandle) => void;
}

interface PhysicalCandleSubscription<
  TCandle,
  TEntry extends CandleSubscriptionEntry<TCandle>
> extends CandleChannel {
  subscribers: Map<string, TEntry>;
  active: boolean;
  unsubscribe: () => void;
}

const getCandleChannelKey = (channel: CandleChannel) =>
  JSON.stringify([channel.symbol, channel.subscribeInterval]);

const sharesCandleChannel = (a: CandleChannel, b: CandleChannel) =>
  getCandleChannelKey(a) === getCandleChannelKey(b);

/**
 * The SDK dispatches candle frames by channel *type*, so every physical candle
 * listener sees every subscribed channel's bars. Only forward a frame to the
 * listener for the channel named by its metadata.
 *
 * Frames without `s`/`i` are let through. Hyperliquid candle frames currently
 * carry both fields, but accepting an unlabelled frame preserves liveness if a
 * compatible SDK version omits them.
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
 * Multiplexes logical TradingView subscribers over physical SDK channels.
 *
 * Replacing the same UID on the same channel only replaces its consumer; it
 * must not bounce the SDK channel, because a late teardown for the old series
 * can otherwise silence the replacement. Moving a UID to a different channel
 * releases its old physical channel when no other logical subscriber uses it.
 */
export class CandleSubscriptionRegistry<
  TCandle extends { s?: string; i?: string },
  TEntry extends CandleSubscriptionEntry<TCandle> = CandleSubscriptionEntry<TCandle>
> {
  private readonly subscribers = new Map<string, TEntry>();

  private readonly channels = new Map<
    string,
    PhysicalCandleSubscription<TCandle, TEntry>
  >();

  get subscriberCount() {
    return this.subscribers.size;
  }

  get channelCount() {
    return this.channels.size;
  }

  subscribe(
    subscriberUID: string,
    entry: TEntry,
    openChannel: (
      onCandle: (candle: TCandle) => void
    ) => { unsubscribe: () => void }
  ): TEntry {
    const current = this.subscribers.get(subscriberUID);
    if (current && sharesCandleChannel(current, entry)) {
      const currentPhysical = this.channels.get(getCandleChannelKey(current));
      if (currentPhysical) {
        currentPhysical.subscribers.set(subscriberUID, entry);
        this.subscribers.set(subscriberUID, entry);
        return entry;
      }
    }

    const channelKey = getCandleChannelKey(entry);
    let physical = this.channels.get(channelKey);
    if (!physical) {
      physical = {
        symbol: entry.symbol,
        subscribeInterval: entry.subscribeInterval,
        subscribers: new Map(),
        active: true,
        unsubscribe: () => undefined,
      };
      this.channels.set(channelKey, physical);

      try {
        const subscription = openChannel((candle) => {
          if (!physical?.active || !isCandleForChannel(candle, physical)) {
            return;
          }

          // Snapshot entries so one consumer can unsubscribe itself without
          // skipping peers. A full registry clear marks the physical channel
          // inactive and stops the rest of this in-flight dispatch.
          for (const [uid, subscriber] of Array.from(
            physical.subscribers.entries()
          )) {
            if (!physical.active) break;
            if (physical.subscribers.get(uid) !== subscriber) continue;
            subscriber.onCandle(candle);
          }
        });
        physical.unsubscribe = subscription.unsubscribe;
      } catch (error) {
        physical.active = false;
        physical.subscribers.clear();
        this.channels.delete(channelKey);
        throw error;
      }
    }

    // Opening the destination is transactional: only detach the current entry
    // after the new physical channel exists. A synchronous open failure leaves
    // the UID riding its original channel instead of losing both registrations.
    if (current && !sharesCandleChannel(current, entry)) {
      const currentChannelKey = getCandleChannelKey(current);
      const currentPhysical = this.channels.get(currentChannelKey);
      currentPhysical?.subscribers.delete(subscriberUID);
      if (currentPhysical && currentPhysical.subscribers.size === 0) {
        currentPhysical.active = false;
        currentPhysical.subscribers.clear();
        this.channels.delete(currentChannelKey);
        currentPhysical.unsubscribe();
      }
    }

    physical.subscribers.set(subscriberUID, entry);
    this.subscribers.set(subscriberUID, entry);
    return entry;
  }

  unsubscribe(subscriberUID: string): void {
    const entry = this.subscribers.get(subscriberUID);
    if (!entry) return;

    this.subscribers.delete(subscriberUID);
    const channelKey = getCandleChannelKey(entry);
    const physical = this.channels.get(channelKey);
    if (!physical) return;

    physical.subscribers.delete(subscriberUID);
    if (physical.subscribers.size > 0) return;

    physical.active = false;
    physical.subscribers.clear();
    this.channels.delete(channelKey);
    physical.unsubscribe();
  }

  forEachSubscriber(callback: (entry: TEntry, subscriberUID: string) => void) {
    this.subscribers.forEach(callback);
  }

  clear(): void {
    const physicalSubscriptions = Array.from(this.channels.values());
    physicalSubscriptions.forEach((physical) => {
      physical.active = false;
      physical.subscribers.clear();
    });
    this.channels.clear();
    this.subscribers.clear();
    physicalSubscriptions.forEach((physical) => physical.unsubscribe());
  }
}
