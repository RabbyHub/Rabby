import {
  CandleSubscriptionEntry,
  CandleSubscriptionRegistry,
  isCandleForChannel,
} from '@/ui/views/Perps/candleSubscriptions';

type MockCandle = {
  s?: string;
  i?: string;
  close: number;
};

/**
 * Mirrors the SDK behavior relevant to candles:
 *
 * - the server channel is keyed by coin+interval and is not refcounted;
 * - callbacks are dispatched by channel type, so every candle callback sees
 *   every candle frame and has to filter by `s`/`i` itself.
 */
const createMockSdkWs = () => {
  const frames: string[] = [];
  const openChannels = new Set<string>();
  const listeners = new Set<(candle: MockCandle) => void>();
  const allListeners = new Set<(candle: MockCandle) => void>();
  const keyOf = (coin: string, interval: string) => `${coin}:${interval}`;

  return {
    frames,
    isChannelOpen: (coin: string, interval: string) =>
      openChannels.has(keyOf(coin, interval)),

    subscribeToCandles(
      coin: string,
      interval: string,
      callback: (candle: MockCandle) => void
    ) {
      const key = keyOf(coin, interval);
      frames.push(`subscribe ${key}`);
      openChannels.add(key);
      listeners.add(callback);
      allListeners.add(callback);

      return {
        unsubscribe: () => {
          frames.push(`unsubscribe ${key}`);
          openChannels.delete(key);
          listeners.delete(callback);
        },
      };
    },

    push(coin: string, interval: string, close: number) {
      if (!openChannels.has(keyOf(coin, interval))) return;
      [...listeners].forEach((listener) =>
        listener({ s: coin, i: interval, close })
      );
    },

    emitLate(coin: string, interval: string, close: number) {
      [...allListeners].forEach((listener) =>
        listener({ s: coin, i: interval, close })
      );
    },
  };
};

type Registry = CandleSubscriptionRegistry<
  MockCandle,
  CandleSubscriptionEntry<MockCandle>
>;
type Ws = ReturnType<typeof createMockSdkWs>;

const subscribe = (
  registry: Registry,
  ws: Ws,
  subscriberUID: string,
  symbol: string,
  interval: string,
  received: number[]
) =>
  registry.subscribe(
    subscriberUID,
    {
      symbol,
      subscribeInterval: interval,
      onCandle: (candle) => received.push(candle.close),
    },
    (onCandle) => ws.subscribeToCandles(symbol, interval, onCandle)
  );

describe('CandleSubscriptionRegistry', () => {
  it('multiplexes daily and weekly series over one physical daily channel', () => {
    const ws = createMockSdkWs();
    const registry = new CandleSubscriptionRegistry<MockCandle>();
    const daily: number[] = [];
    const weekly: number[] = [];

    subscribe(registry, ws, 'BTC_#_1D', 'BTC', '1d', daily);
    subscribe(registry, ws, 'BTC_#_1W', 'BTC', '1d', weekly);
    ws.push('BTC', '1d', 101);

    expect(ws.frames).toEqual(['subscribe BTC:1d']);
    expect(daily).toEqual([101]);
    expect(weekly).toEqual([101]);
    expect(registry.subscriberCount).toBe(2);
    expect(registry.channelCount).toBe(1);
  });

  it('keeps both cached series live when TradingView revisits without subscribing again', () => {
    const ws = createMockSdkWs();
    const registry = new CandleSubscriptionRegistry<MockCandle>();
    const daily: number[] = [];
    const weekly: number[] = [];

    // TradingView registers each pair once, retains the callbacks while the
    // symbol remains on screen, and can revisit 1D without another subscribe.
    subscribe(registry, ws, 'BTC_#_1D', 'BTC', '1d', daily);
    subscribe(registry, ws, 'BTC_#_1W', 'BTC', '1d', weekly);
    ws.push('BTC', '1d', 102);

    expect(daily[daily.length - 1]).toBe(102);
    expect(weekly[weekly.length - 1]).toBe(102);
    expect(ws.isChannelOpen('BTC', '1d')).toBe(true);
  });

  it('does not close a shared channel until its last logical subscriber leaves', () => {
    const ws = createMockSdkWs();
    const registry = new CandleSubscriptionRegistry<MockCandle>();
    const daily: number[] = [];
    const weekly: number[] = [];

    subscribe(registry, ws, 'BTC_#_1D', 'BTC', '1d', daily);
    subscribe(registry, ws, 'BTC_#_1W', 'BTC', '1d', weekly);
    registry.unsubscribe('BTC_#_1D');
    ws.push('BTC', '1d', 103);

    expect(ws.frames).toEqual(['subscribe BTC:1d']);
    expect(daily).toEqual([]);
    expect(weekly).toEqual([103]);

    registry.unsubscribe('BTC_#_1W');
    expect(ws.frames).toEqual(['subscribe BTC:1d', 'unsubscribe BTC:1d']);
    expect(ws.isChannelOpen('BTC', '1d')).toBe(false);
  });

  it('replaces a reused UID without bouncing its physical channel', () => {
    const ws = createMockSdkWs();
    const registry = new CandleSubscriptionRegistry<MockCandle>();
    const oldSeries: number[] = [];
    const liveSeries: number[] = [];

    subscribe(registry, ws, 'BTC_#_15', 'BTC', '15m', oldSeries);
    subscribe(registry, ws, 'BTC_#_15', 'BTC', '15m', liveSeries);
    ws.push('BTC', '15m', 104);

    expect(ws.frames).toEqual(['subscribe BTC:15m']);
    expect(oldSeries).toEqual([]);
    expect(liveSeries).toEqual([104]);
    expect(registry.subscriberCount).toBe(1);
  });

  it('moves a reused UID to a different physical channel', () => {
    const ws = createMockSdkWs();
    const registry = new CandleSubscriptionRegistry<MockCandle>();
    const received: number[] = [];

    subscribe(registry, ws, 'uid-1', 'BTC', '15m', received);
    subscribe(registry, ws, 'uid-1', 'BTC', '1h', received);

    expect(ws.frames).toEqual([
      'subscribe BTC:15m',
      'subscribe BTC:1h',
      'unsubscribe BTC:15m',
    ]);
    expect(ws.isChannelOpen('BTC', '15m')).toBe(false);
    expect(ws.isChannelOpen('BTC', '1h')).toBe(true);
  });

  it('keeps the old channel when opening a replacement throws', () => {
    const ws = createMockSdkWs();
    const registry = new CandleSubscriptionRegistry<MockCandle>();
    const received: number[] = [];

    subscribe(registry, ws, 'uid-1', 'BTC', '15m', received);
    expect(() =>
      registry.subscribe(
        'uid-1',
        {
          symbol: 'BTC',
          subscribeInterval: '1h',
          onCandle: (candle) => received.push(candle.close),
        },
        () => {
          throw new Error('open failed');
        }
      )
    ).toThrow('open failed');

    ws.push('BTC', '15m', 105);
    expect(received).toEqual([105]);
    expect(ws.isChannelOpen('BTC', '15m')).toBe(true);
    expect(registry.subscriberCount).toBe(1);
    expect(registry.channelCount).toBe(1);
  });

  it('filters the SDK type-level fanout to the matching physical channel', () => {
    const ws = createMockSdkWs();
    const registry = new CandleSubscriptionRegistry<MockCandle>();
    const btc: number[] = [];
    const eth: number[] = [];

    subscribe(registry, ws, 'btc', 'BTC', '15m', btc);
    subscribe(registry, ws, 'eth', 'ETH', '1h', eth);
    ws.push('BTC', '15m', 105);
    ws.push('ETH', '1h', 106);

    expect(btc).toEqual([105]);
    expect(eth).toEqual([106]);
  });

  it('clears every physical channel exactly once', () => {
    const ws = createMockSdkWs();
    const registry = new CandleSubscriptionRegistry<MockCandle>();

    subscribe(registry, ws, 'daily', 'BTC', '1d', []);
    subscribe(registry, ws, 'weekly', 'BTC', '1d', []);
    subscribe(registry, ws, 'eth', 'ETH', '1h', []);
    registry.clear();

    expect(ws.frames).toEqual([
      'subscribe BTC:1d',
      'subscribe ETH:1h',
      'unsubscribe BTC:1d',
      'unsubscribe ETH:1h',
    ]);
    expect(registry.subscriberCount).toBe(0);
    expect(registry.channelCount).toBe(0);
  });

  it('drops a late SDK callback after clear', () => {
    const ws = createMockSdkWs();
    const registry = new CandleSubscriptionRegistry<MockCandle>();
    const received: number[] = [];

    subscribe(registry, ws, 'daily', 'BTC', '1d', received);
    registry.clear();
    ws.emitLate('BTC', '1d', 107);

    expect(received).toEqual([]);
  });

  it('stops an in-flight fanout when a consumer clears the registry', () => {
    const ws = createMockSdkWs();
    const registry = new CandleSubscriptionRegistry<MockCandle>();
    const first: number[] = [];
    const second: number[] = [];

    registry.subscribe(
      'first',
      {
        symbol: 'BTC',
        subscribeInterval: '1d',
        onCandle: (candle) => {
          first.push(candle.close);
          registry.clear();
        },
      },
      (onCandle) => ws.subscribeToCandles('BTC', '1d', onCandle)
    );
    subscribe(registry, ws, 'second', 'BTC', '1d', second);
    ws.push('BTC', '1d', 108);

    expect(first).toEqual([108]);
    expect(second).toEqual([]);
  });

  it('treats an unknown UID unsubscribe as a no-op', () => {
    const ws = createMockSdkWs();
    const registry = new CandleSubscriptionRegistry<MockCandle>();

    subscribe(registry, ws, 'daily', 'BTC', '1d', []);
    registry.unsubscribe('missing');

    expect(ws.frames).toEqual(['subscribe BTC:1d']);
    expect(registry.subscriberCount).toBe(1);
  });
});

describe('isCandleForChannel', () => {
  const channel = { symbol: 'BTC', subscribeInterval: '1d' };

  it('accepts its own channel and rejects another coin or interval', () => {
    expect(isCandleForChannel({ s: 'BTC', i: '1d' }, channel)).toBe(true);
    expect(isCandleForChannel({ s: 'ETH', i: '1d' }, channel)).toBe(false);
    expect(isCandleForChannel({ s: 'BTC', i: '1h' }, channel)).toBe(false);
  });

  it('accepts a frame without channel metadata', () => {
    expect(isCandleForChannel({}, channel)).toBe(true);
  });
});
