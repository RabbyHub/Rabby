import {
  closeAllCandleSubscriptions,
  closeCandleSubscription,
  isCandleForChannel,
  openCandleSubscription,
  CandleSubscriptionEntry,
} from '@/ui/views/Perps/candleSubscriptions';

/**
 * Stands in for the SDK's WebSocketClient. The behaviour that matters here is
 * that a candle channel is keyed by coin+interval and is *not* refcounted:
 * unsubscribe() tells the server to stop pushing the whole channel, however
 * many callbacks are still attached to it.
 */
const createMockSdkWs = () => {
  const frames: string[] = [];
  const openChannels = new Set<string>();
  const callbacks = new Map<string, Set<(bar: number) => void>>();

  const keyOf = (coin: string, interval: string) => `${coin}:${interval}`;

  return {
    frames,
    isChannelOpen: (coin: string, interval: string) =>
      openChannels.has(keyOf(coin, interval)),

    subscribeToCandles(
      coin: string,
      interval: string,
      callback: (bar: number) => void
    ) {
      const key = keyOf(coin, interval);
      frames.push(`subscribe ${key}`);
      openChannels.add(key);
      const attached = callbacks.get(key) || new Set();
      attached.add(callback);
      callbacks.set(key, attached);

      return {
        unsubscribe: () => {
          frames.push(`unsubscribe ${key}`);
          // No refcount: the server stops pushing the channel outright.
          openChannels.delete(key);
          callbacks.get(key)?.delete(callback);
        },
      };
    },

    /** Server push. Only reaches listeners while the channel is open. */
    push(coin: string, interval: string, bar: number) {
      const key = keyOf(coin, interval);
      if (!openChannels.has(key)) return;
      callbacks.get(key)?.forEach((callback) => callback(bar));
    },
  };
};

type Ws = ReturnType<typeof createMockSdkWs>;

const BTC_15M = { symbol: 'BTC', subscribeInterval: '15m' };

const subscribe = (
  ws: Ws,
  subscriptions: Map<string, CandleSubscriptionEntry>,
  subscriberUID: string,
  received: Map<string, number[]>,
  channel = BTC_15M
) => {
  received.set(subscriberUID, []);
  return openCandleSubscription(
    subscriptions,
    subscriberUID,
    channel,
    () => {
      const subscription = ws.subscribeToCandles(
        channel.symbol,
        channel.subscribeInterval,
        (bar) => received.get(subscriberUID)?.push(bar)
      );
      return { ...channel, unsubscribe: subscription.unsubscribe };
    }
  );
};

describe('openCandleSubscription', () => {
  it('keeps the live subscription when the superseded UID is retired late', () => {
    const ws = createMockSdkWs();
    const subscriptions = new Map<string, CandleSubscriptionEntry>();
    const received = new Map<string, number[]>();

    subscribe(ws, subscriptions, 'uid-old', received);
    // TradingView opens the replacement before it retires the previous UID...
    subscribe(ws, subscriptions, 'uid-new', received);
    // ...and only then unsubscribes the old one.
    closeCandleSubscription(subscriptions, 'uid-old');

    ws.push('BTC', '15m', 42);

    expect(ws.isChannelOpen('BTC', '15m')).toBe(true);
    expect(received.get('uid-new')).toEqual([42]);
    expect(subscriptions.size).toBe(1);
  });

  it('orders the frames unsubscribe-then-subscribe when replacing a channel', () => {
    const ws = createMockSdkWs();
    const subscriptions = new Map<string, CandleSubscriptionEntry>();
    const received = new Map<string, number[]>();

    subscribe(ws, subscriptions, 'uid-old', received);
    subscribe(ws, subscriptions, 'uid-new', received);

    expect(ws.frames).toEqual([
      'subscribe BTC:15m',
      'unsubscribe BTC:15m',
      'subscribe BTC:15m',
    ]);
  });

  it('stops feeding a superseded UID', () => {
    const ws = createMockSdkWs();
    const subscriptions = new Map<string, CandleSubscriptionEntry>();
    const received = new Map<string, number[]>();

    subscribe(ws, subscriptions, 'uid-old', received);
    subscribe(ws, subscriptions, 'uid-new', received);
    ws.push('BTC', '15m', 7);

    expect(received.get('uid-old')).toEqual([]);
  });

  it('leaves subscriptions on other channels alone', () => {
    const ws = createMockSdkWs();
    const subscriptions = new Map<string, CandleSubscriptionEntry>();
    const received = new Map<string, number[]>();

    subscribe(ws, subscriptions, 'uid-eth', received, {
      symbol: 'ETH',
      subscribeInterval: '15m',
    });
    subscribe(ws, subscriptions, 'uid-btc-1h', received, {
      symbol: 'BTC',
      subscribeInterval: '1h',
    });
    subscribe(ws, subscriptions, 'uid-btc-15m', received);

    ws.push('ETH', '15m', 1);
    ws.push('BTC', '1h', 2);

    expect(received.get('uid-eth')).toEqual([1]);
    expect(received.get('uid-btc-1h')).toEqual([2]);
    expect(subscriptions.size).toBe(3);
  });

  it('replaces an entry reusing the same UID', () => {
    const ws = createMockSdkWs();
    const subscriptions = new Map<string, CandleSubscriptionEntry>();
    const received = new Map<string, number[]>();

    subscribe(ws, subscriptions, 'uid-1', received, {
      symbol: 'BTC',
      subscribeInterval: '1h',
    });
    subscribe(ws, subscriptions, 'uid-1', received);

    expect(ws.isChannelOpen('BTC', '1h')).toBe(false);
    expect(ws.isChannelOpen('BTC', '15m')).toBe(true);
    expect(subscriptions.size).toBe(1);
  });
});

describe('closeCandleSubscription', () => {
  it('is a no-op for a UID that was already superseded', () => {
    const ws = createMockSdkWs();
    const subscriptions = new Map<string, CandleSubscriptionEntry>();
    const received = new Map<string, number[]>();

    subscribe(ws, subscriptions, 'uid-old', received);
    subscribe(ws, subscriptions, 'uid-new', received);
    const framesBefore = [...ws.frames];

    closeCandleSubscription(subscriptions, 'uid-old');

    expect(ws.frames).toEqual(framesBefore);
  });

  it('retires the channel when the live UID is unsubscribed', () => {
    const ws = createMockSdkWs();
    const subscriptions = new Map<string, CandleSubscriptionEntry>();
    const received = new Map<string, number[]>();

    subscribe(ws, subscriptions, 'uid-live', received);
    closeCandleSubscription(subscriptions, 'uid-live');
    ws.push('BTC', '15m', 9);

    expect(ws.isChannelOpen('BTC', '15m')).toBe(false);
    expect(received.get('uid-live')).toEqual([]);
    expect(subscriptions.size).toBe(0);
  });
});

describe('closeAllCandleSubscriptions', () => {
  it('retires every channel and empties the map', () => {
    const ws = createMockSdkWs();
    const subscriptions = new Map<string, CandleSubscriptionEntry>();
    const received = new Map<string, number[]>();

    subscribe(ws, subscriptions, 'uid-btc', received);
    subscribe(ws, subscriptions, 'uid-eth', received, {
      symbol: 'ETH',
      subscribeInterval: '1h',
    });

    closeAllCandleSubscriptions(subscriptions);

    expect(ws.isChannelOpen('BTC', '15m')).toBe(false);
    expect(ws.isChannelOpen('ETH', '1h')).toBe(false);
    expect(subscriptions.size).toBe(0);
  });
});

describe('isCandleForChannel', () => {
  const channel = { symbol: 'BTC', subscribeInterval: '15m' };

  it('accepts a frame from its own channel', () => {
    expect(isCandleForChannel({ s: 'BTC', i: '15m' }, channel)).toBe(true);
  });

  it('rejects another coin', () => {
    expect(isCandleForChannel({ s: 'ETH', i: '15m' }, channel)).toBe(false);
  });

  it('rejects another interval on the same coin', () => {
    expect(isCandleForChannel({ s: 'BTC', i: '1h' }, channel)).toBe(false);
  });

  it('accepts a frame that carries no channel metadata', () => {
    // Starving the listener would freeze the chart — the failure this guards
    // against — so an unlabelled frame is let through.
    expect(isCandleForChannel({}, channel)).toBe(true);
  });

  it('matches the daily channel a weekly subscription rides on', () => {
    expect(
      isCandleForChannel(
        { s: 'BTC', i: '1d' },
        { symbol: 'BTC', subscribeInterval: '1d' }
      )
    ).toBe(true);
  });
});

/**
 * The SDK fans candle frames out by channel *type*: while two channels overlap,
 * both listeners see both channels' bars. This mirrors that dispatch so the
 * guard is exercised the way it runs in production.
 */
const createTypeFanoutSdkWs = () => {
  const listeners: Array<(candle: { s: string; i: string; c: string }) => void> = [];
  const openChannels = new Set<string>();

  return {
    subscribeToCandles(
      coin: string,
      interval: string,
      callback: (candle: { s: string; i: string; c: string }) => void
    ) {
      openChannels.add(`${coin}:${interval}`);
      listeners.push(callback);
      return {
        unsubscribe: () => {
          openChannels.delete(`${coin}:${interval}`);
          const index = listeners.indexOf(callback);
          if (index >= 0) listeners.splice(index, 1);
        },
      };
    },

    push(coin: string, interval: string, close: string) {
      if (!openChannels.has(`${coin}:${interval}`)) return;
      // No per-channel routing: every candle listener gets the frame.
      [...listeners].forEach((listener) =>
        listener({ s: coin, i: interval, c: close })
      );
    },
  };
};

describe('overlapping channels', () => {
  it('does not forward another channel bars while both are open', () => {
    const ws = createTypeFanoutSdkWs();
    const forwarded: string[] = [];
    const channel = { symbol: 'BTC', subscribeInterval: '1h' };

    // A superseded 15m listener is still attached...
    ws.subscribeToCandles('BTC', '15m', () => undefined);
    // ...while the chart now rides the 1h channel.
    ws.subscribeToCandles('BTC', '1h', (candle) => {
      if (!isCandleForChannel(candle, channel)) return;
      forwarded.push(candle.c);
    });

    ws.push('BTC', '15m', '100');
    ws.push('BTC', '1h', '200');

    expect(forwarded).toEqual(['200']);
  });
});
