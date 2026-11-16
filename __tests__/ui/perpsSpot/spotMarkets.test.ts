import type { SpotMeta } from '@rabby-wallet/hyperliquid-sdk';

import type { OpenOrder } from '@rabby-wallet/hyperliquid-sdk';

import {
  buildSpotBalanceItems,
  buildSpotMarkets,
  buildSpotOpenOrderItems,
  filterSpotMarkets,
  filterSpotMarketsByTab,
  formatSpotLimitPrice,
  formatSpotPrice,
  formatSpotSize,
  getSpotAmountConversionPrice,
  getSpotFavoriteKey,
  getSpotMarket24hChange,
  getSpotMarketOrderPrice,
  getSpotMaxQuoteAmount,
  getSpotMaxSize,
  getSpotOrderDistanceFromMid,
  getSpotOrderFillPct,
  getSpotPortfolioValue,
  getSpotSizeFromAmount,
  getSpotTokenBalance,
  getSpotTokenUsdPrices,
  getSpotHeldTokenIndexes,
  groupSpotOpenOrders,
  isSpotMarketFavorite,
  isSpotOpenOrder,
  normalizeSpotCancelIntents,
  sortSpotMarkets,
  validateSpotOrder,
} from '@/ui/views/PerpsSpot/utils/spotMarkets';

const spotMeta: SpotMeta = {
  tokens: [
    { name: 'USDC', index: 0, szDecimals: 8 },
    { name: 'PURR', index: 1, szDecimals: 0 },
    { name: 'HYPE', index: 150, szDecimals: 2 },
    { name: 'DEAD', index: 200, szDecimals: 1 },
  ],
  universe: [
    { name: 'PURR/USDC', index: 0, tokens: [1, 0], isCanonical: true },
    { name: '@107', index: 107, tokens: [150, 0] },
    { name: '@300', index: 300, tokens: [200, 0] },
    // Unknown token index: dropped.
    { name: '@301', index: 301, tokens: [999, 0] },
  ],
};

const mids = { 'PURR/USDC': '0.2', '@107': '38.5' };

describe('buildSpotMarkets', () => {
  it('maps the universe to markets keyed by pair name', () => {
    const markets = buildSpotMarkets(spotMeta, mids);
    expect(markets).toHaveLength(3);
    expect(markets[1]).toEqual({
      pairIndex: 107,
      coin: '@107',
      baseName: 'HYPE',
      quoteName: 'USDC',
      baseTokenIndex: 150,
      quoteTokenIndex: 0,
      szDecimals: 2,
      isCanonical: false,
      midPx: '38.5',
      prevDayPx: null,
      dayNtlVlm: null,
    });
  });

  it('returns nothing without meta', () => {
    expect(buildSpotMarkets(null, mids)).toEqual([]);
  });
});

describe('sortSpotMarkets / filterSpotMarkets', () => {
  it('drops unpriced pairs and puts canonical pairs first', () => {
    const sorted = sortSpotMarkets(buildSpotMarkets(spotMeta, mids));
    expect(sorted.map((m) => m.coin)).toEqual(['PURR/USDC', '@107']);
  });

  it('matches base names and pair names case-insensitively', () => {
    const markets = buildSpotMarkets(spotMeta, mids);
    expect(filterSpotMarkets(markets, 'hy').map((m) => m.coin)).toEqual([
      '@107',
    ]);
    expect(filterSpotMarkets(markets, 'purr/u').map((m) => m.coin)).toEqual([
      'PURR/USDC',
    ]);
    expect(filterSpotMarkets(markets, '  ')).toHaveLength(3);
  });
});

describe('formatSpotSize', () => {
  it('rounds down to szDecimals', () => {
    expect(formatSpotSize('1.239', 2)).toBe('1.23');
    expect(formatSpotSize('15.9', 0)).toBe('15');
    expect(formatSpotSize('-1', 2)).toBe('0');
    expect(formatSpotSize('abc', 2)).toBe('0');
  });
});

describe('formatSpotPrice', () => {
  it('keeps 5 significant figures', () => {
    expect(formatSpotPrice('38.51234', 2)).toBe('38.512');
    expect(formatSpotPrice('0.2000049', 0)).toBe('0.2');
  });

  it('caps decimals at 8 - szDecimals', () => {
    expect(formatSpotPrice('0.000123456', 4)).toBe('0.0001');
    expect(formatSpotPrice('0.000123456', 0)).toBe('0.00012346');
  });

  it('always allows integer prices', () => {
    expect(formatSpotPrice('123456.7', 2)).toBe('123457');
    expect(formatSpotPrice('12345.4', 2)).toBe('12345');
  });

  it('honours the rounding mode', () => {
    expect(formatSpotPrice('1.23456', 2, 1)).toBe('1.2345');
    expect(formatSpotPrice('1.23451', 2, 0)).toBe('1.2346');
  });
});

describe('formatSpotLimitPrice', () => {
  it('rounds toward the passive side', () => {
    expect(formatSpotLimitPrice('12345.6', 'buy', 2)).toBe('12345');
    expect(formatSpotLimitPrice('12345.2', 'sell', 2)).toBe('12346');
  });
});

describe('getSpotMarketOrderPrice', () => {
  it('crosses the mid by the slippage without exceeding it', () => {
    expect(getSpotMarketOrderPrice('38.5', 'buy', 2)).toBe('40.425');
    expect(getSpotMarketOrderPrice('38.5', 'sell', 2)).toBe('36.575');
    expect(getSpotMarketOrderPrice('1.11111', 'buy', 2, 0.1)).toBe('1.2222');
  });
});

describe('validateSpotOrder', () => {
  const base = {
    side: 'buy' as const,
    size: '1',
    price: '38.5',
    szDecimals: 2,
    baseAvailable: '0',
    quoteAvailable: '100',
  };

  it('accepts a funded order', () => {
    expect(validateSpotOrder(base)).toBeNull();
  });

  it('rejects empty sizes and prices', () => {
    expect(validateSpotOrder({ ...base, size: '0.001' })).toBe('invalidSize');
    expect(validateSpotOrder({ ...base, price: '0' })).toBe('invalidPrice');
  });

  it('enforces the 10 USDC minimum', () => {
    expect(validateSpotOrder({ ...base, size: '0.25' })).toBe(
      'belowMinNotional'
    );
  });

  it('checks quote balance on buys and base balance on sells', () => {
    expect(validateSpotOrder({ ...base, size: '3' })).toBe(
      'insufficientBalance'
    );
    expect(validateSpotOrder({ ...base, side: 'sell' })).toBe(
      'insufficientBalance'
    );
    expect(
      validateSpotOrder({ ...base, side: 'sell', baseAvailable: '1' })
    ).toBeNull();
  });
});

describe('validateSpotOrder price guards', () => {
  const draft = {
    side: 'buy' as const,
    size: '1',
    szDecimals: 2,
    baseAvailable: '10',
    quoteAvailable: '1000',
    midPx: '38.5',
  };

  it('refuses limits crossing the mid by more than the market slippage', () => {
    expect(
      validateSpotOrder({ ...draft, orderType: 'limit', price: '41' })
    ).toBe('priceFarFromMarket');
    expect(
      validateSpotOrder({
        ...draft,
        side: 'sell',
        orderType: 'limit',
        price: '36',
      })
    ).toBe('priceFarFromMarket');
    expect(
      validateSpotOrder({ ...draft, orderType: 'limit', price: '30' })
    ).toBeNull();
    expect(
      validateSpotOrder({
        ...draft,
        side: 'sell',
        orderType: 'limit',
        price: '50',
      })
    ).toBeNull();
  });

  it('refuses market prices that do not cross the mid', () => {
    expect(
      validateSpotOrder({ ...draft, orderType: 'market', price: '38.5' })
    ).toBe('invalidPrice');
    expect(
      validateSpotOrder({ ...draft, orderType: 'market', price: '40.425' })
    ).toBeNull();
  });
});

describe('getSpotMaxSize', () => {
  it('uses the quote balance at price for buys', () => {
    expect(
      getSpotMaxSize({
        side: 'buy',
        price: '38.5',
        szDecimals: 2,
        baseAvailable: '5',
        quoteAvailable: '100',
      })
    ).toBe('2.59');
  });

  it('uses the base balance for sells', () => {
    expect(
      getSpotMaxSize({
        side: 'sell',
        price: '38.5',
        szDecimals: 1,
        baseAvailable: '5.67',
        quoteAvailable: '100',
      })
    ).toBe('5.6');
  });
});

describe('isSpotOpenOrder', () => {
  it('detects spot market keys', () => {
    expect(isSpotOpenOrder({ coin: '@107' })).toBe(true);
    expect(isSpotOpenOrder({ coin: 'PURR/USDC' })).toBe(true);
    expect(isSpotOpenOrder({ coin: 'BTC' })).toBe(false);
    expect(isSpotOpenOrder({ coin: 'xyz:TSLA' })).toBe(false);
  });
});

describe('buildSpotOpenOrderItems', () => {
  const order = (coin: string, oid: number, timestamp: number) =>
    ({ coin, oid, timestamp, side: 'B', sz: '1', limitPx: '1' } as OpenOrder);

  it('keeps spot orders of known pairs, newest first', () => {
    const markets = buildSpotMarkets(spotMeta, mids);
    const items = buildSpotOpenOrderItems(
      [
        order('@107', 1, 100),
        order('BTC', 2, 300),
        order('PURR/USDC', 3, 200),
        order('@999', 4, 400),
      ],
      markets
    );
    expect(items.map((item) => item.order.oid)).toEqual([3, 1]);
    expect(items[0].market.pairIndex).toBe(0);
    expect(items[1].market.pairIndex).toBe(107);
  });

  it('returns nothing without orders', () => {
    expect(buildSpotOpenOrderItems(undefined, [])).toEqual([]);
  });
});

describe('buildSpotMarkets with pair contexts', () => {
  const ctxs = [
    {
      coin: 'PURR/USDC',
      midPx: '0.2',
      markPx: '0.21',
      prevDayPx: '0.16',
      dayNtlVlm: '1000',
    },
    // No mid: falls back to the mark price.
    {
      coin: '@107',
      midPx: null,
      markPx: '38.5',
      prevDayPx: '40',
      dayNtlVlm: '5000',
    },
  ];

  it('prefers context prices over the mids map and keeps 24h data', () => {
    const markets = buildSpotMarkets(spotMeta, { 'PURR/USDC': '0.3' }, ctxs);
    const purr = markets.find((m) => m.coin === 'PURR/USDC')!;
    expect(purr.midPx).toBe('0.2');
    expect(purr.prevDayPx).toBe('0.16');
    expect(purr.dayNtlVlm).toBe('1000');
    expect(getSpotMarket24hChange(purr)).toBeCloseTo(0.25);
    const hype = markets.find((m) => m.coin === '@107')!;
    expect(hype.midPx).toBe('38.5');
    expect(getSpotMarket24hChange(hype)).toBeCloseTo(-0.0375);
    const dead = markets.find((m) => m.coin === '@300')!;
    expect(dead.midPx).toBeNull();
    expect(getSpotMarket24hChange(dead)).toBeNull();
  });

  it('sorts by 24h volume when asked', () => {
    const markets = buildSpotMarkets(spotMeta, null, ctxs);
    expect(sortSpotMarkets(markets, 'volume').map((m) => m.coin)).toEqual([
      '@107',
      'PURR/USDC',
    ]);
    expect(sortSpotMarkets(markets).map((m) => m.coin)).toEqual([
      'PURR/USDC',
      '@107',
    ]);
  });
});

describe('filterSpotMarketsByTab / favorites', () => {
  const markets = buildSpotMarkets(spotMeta, mids);

  it('keys favorites with a SPOT prefix so perp favorites stay apart', () => {
    expect(getSpotFavoriteKey({ coin: '@107' })).toBe('SPOT:@107');
    expect(isSpotMarketFavorite(['BTC', 'spot:@107'], { coin: '@107' })).toBe(
      true
    );
    expect(isSpotMarketFavorite(['BTC'], { coin: '@107' })).toBe(false);
  });

  it('filters holdings by base token and favorites by key', () => {
    const options = {
      heldTokenIndexes: new Set([150]),
      favoriteMarkets: ['SPOT:PURR/USDC'],
    };
    expect(filterSpotMarketsByTab(markets, 'all', options)).toHaveLength(3);
    expect(
      filterSpotMarketsByTab(markets, 'holdings', options).map((m) => m.coin)
    ).toEqual(['@107']);
    expect(
      filterSpotMarketsByTab(markets, 'favorites', options).map((m) => m.coin)
    ).toEqual(['PURR/USDC']);
  });
});

describe('spot balances', () => {
  const balances = [
    { coin: 'USDC', token: 0, total: '1337.5', hold: '87.5', entryNtl: '0' },
    { coin: 'PURR', token: 1, total: '620', hold: '0', entryNtl: '0' },
    { coin: 'HYPE', token: 150, total: '12.5', hold: '5', entryNtl: '0' },
    { coin: 'DEAD', token: 200, total: '0', hold: '0', entryNtl: '0' },
  ];
  const markets = buildSpotMarkets(spotMeta, mids);

  it('splits total, hold and available', () => {
    expect(getSpotTokenBalance(balances, 0)).toEqual({
      total: '1337.5',
      hold: '87.5',
      available: '1250',
    });
    expect(getSpotTokenBalance(balances, 999)).toEqual({
      total: '0',
      hold: '0',
      available: '0',
    });
    expect(Array.from(getSpotHeldTokenIndexes(balances))).toEqual([0, 1, 150]);
  });

  it('values balances at the USDC pair mid, largest first', () => {
    const items = buildSpotBalanceItems(balances, markets);
    expect(items.map((item) => item.balance.coin)).toEqual([
      'USDC',
      'HYPE',
      'PURR',
    ]);
    expect(items[0].usdValue).toBe('1337.5');
    expect(items[1].usdValue).toBe('481.25');
    expect(items[1].market?.coin).toBe('@107');
    expect(items[2].usdValue).toBe('124');
    expect(getSpotPortfolioValue(items)).toBe('1942.75');
  });

  it('values tokens without a USDC pair through their quote token', () => {
    const crossMeta: SpotMeta = {
      tokens: [
        { name: 'USDC', index: 0, szDecimals: 8 },
        { name: 'USDH', index: 360, szDecimals: 2 },
        { name: 'UXPL', index: 400, szDecimals: 1 },
        { name: 'ORPH', index: 500, szDecimals: 1 },
      ],
      universe: [
        { name: '@230', index: 230, tokens: [360, 0] },
        { name: '@240', index: 240, tokens: [400, 360] },
        // Quote token with no USDC price: stays unpriced.
        { name: '@250', index: 250, tokens: [500, 400] },
      ],
    };
    const crossMarkets = buildSpotMarkets(crossMeta, {
      '@230': '0.999',
      '@240': '2',
    });
    expect(Object.fromEntries(getSpotTokenUsdPrices(crossMarkets))).toEqual({
      0: '1',
      360: '0.999',
      400: '1.998',
    });

    const items = buildSpotBalanceItems(
      [
        { coin: 'USDC', token: 0, total: '10', hold: '0', entryNtl: '0' },
        { coin: 'UXPL', token: 400, total: '50', hold: '0', entryNtl: '0' },
        { coin: 'ORPH', token: 500, total: '3', hold: '0', entryNtl: '0' },
      ],
      crossMarkets
    );
    expect(items.map((item) => [item.balance.coin, item.usdValue])).toEqual([
      ['UXPL', '99.9'],
      ['USDC', '10'],
      ['ORPH', null],
    ]);
    expect(items[0].market?.coin).toBe('@240');
    expect(items[1].market).toBeNull();
    expect(getSpotPortfolioValue(items)).toBe('109.9');
  });
});

describe('open order helpers', () => {
  const makeOrder = (overrides: Partial<OpenOrder>): OpenOrder =>
    ({
      coin: 'PURR/USDC',
      side: 'B',
      limitPx: '0.175',
      sz: '380',
      origSz: '500',
      oid: 1,
      timestamp: 1,
      ...overrides,
    } as OpenOrder);

  it('computes the filled share and distance from mid', () => {
    expect(getSpotOrderFillPct(makeOrder({}))).toBeCloseTo(24);
    expect(getSpotOrderFillPct(makeOrder({ origSz: '0' }))).toBe(0);
    expect(getSpotOrderDistanceFromMid(makeOrder({}), '0.2')).toBeCloseTo(
      -0.125
    );
    expect(getSpotOrderDistanceFromMid(makeOrder({}), null)).toBeNull();
  });

  it('groups orders by pair in newest-first order', () => {
    const markets = buildSpotMarkets(spotMeta, mids);
    const items = buildSpotOpenOrderItems(
      [
        makeOrder({ oid: 1, timestamp: 1 }),
        makeOrder({ oid: 2, coin: '@107', timestamp: 3 }),
        makeOrder({ oid: 3, timestamp: 2 }),
      ],
      markets
    );
    const groups = groupSpotOpenOrders(items);
    expect(groups.map((g) => g.market.coin)).toEqual(['@107', 'PURR/USDC']);
    expect(groups[1].orders.map((o) => o.oid)).toEqual([3, 1]);
  });
});

describe('amount unit conversion', () => {
  it('converts quote amounts to a rounded base size', () => {
    expect(
      getSpotSizeFromAmount({
        amount: '100',
        unit: 'quote',
        price: '0.3',
        szDecimals: 0,
      })
    ).toBe('333');
    expect(
      getSpotSizeFromAmount({
        amount: '1.239',
        unit: 'base',
        price: null,
        szDecimals: 2,
      })
    ).toBe('1.23');
    expect(
      getSpotSizeFromAmount({
        amount: '100',
        unit: 'quote',
        price: null,
        szDecimals: 0,
      })
    ).toBe('0');
  });

  it('caps quote amounts at the balance side being spent', () => {
    expect(
      getSpotMaxQuoteAmount({
        side: 'buy',
        price: '0.2',
        baseAvailable: '10',
        quoteAvailable: '123.456',
      })
    ).toBe('123.45');
    expect(
      getSpotMaxQuoteAmount({
        side: 'sell',
        price: '0.2',
        baseAvailable: '10',
        quoteAvailable: '123.456',
      })
    ).toBe('2');
    expect(
      getSpotMaxQuoteAmount({
        side: 'sell',
        price: null,
        baseAvailable: '10',
        quoteAvailable: '1',
      })
    ).toBe('0');
  });
});

describe('getSpotAmountConversionPrice', () => {
  const base = { midPx: '100', orderPrice: '105' };

  it('converts quote market buys at the signed IOC price', () => {
    expect(
      getSpotAmountConversionPrice({
        ...base,
        orderType: 'market',
        side: 'buy',
        unit: 'quote',
      })
    ).toBe('105');
    expect(
      getSpotAmountConversionPrice({
        ...base,
        orderPrice: '0',
        orderType: 'market',
        side: 'buy',
        unit: 'quote',
      })
    ).toBeNull();
  });

  it('converts other market orders at the mid and limits at the limit', () => {
    expect(
      getSpotAmountConversionPrice({
        midPx: '100',
        orderPrice: '95',
        orderType: 'market',
        side: 'sell',
        unit: 'quote',
      })
    ).toBe('100');
    expect(
      getSpotAmountConversionPrice({
        midPx: '100',
        orderPrice: '98',
        orderType: 'limit',
        side: 'buy',
        unit: 'quote',
      })
    ).toBe('98');
  });

  it('keeps a quote market buy within the typed amount at the worst fill', () => {
    const szDecimals = 2;
    const midPx = '100';
    const amount = '100';
    const orderPrice = getSpotMarketOrderPrice(midPx, 'buy', szDecimals);
    expect(orderPrice).toBe('105');
    const size = getSpotSizeFromAmount({
      amount,
      unit: 'quote',
      price: getSpotAmountConversionPrice({
        orderType: 'market',
        side: 'buy',
        unit: 'quote',
        midPx,
        orderPrice,
      }),
      szDecimals,
    });
    expect(size).toBe('0.95');
    const worstSpend = Number(size) * Number(orderPrice);
    expect(worstSpend).toBeLessThanOrEqual(Number(amount));
    // The whole balance stays usable: no slippage headroom needed.
    expect(
      validateSpotOrder({
        side: 'buy',
        size,
        price: orderPrice,
        szDecimals,
        baseAvailable: '0',
        quoteAvailable: amount,
        midPx,
        orderType: 'market',
      })
    ).toBeNull();
  });
});

describe('normalizeSpotCancelIntents', () => {
  it('dedupes by oid and rejects malformed ids', () => {
    expect(
      normalizeSpotCancelIntents([
        { pairIndex: 107, oid: 2 },
        { pairIndex: 107, oid: 2 },
        { pairIndex: 0, oid: 1 },
      ])
    ).toEqual([
      { pairIndex: 107, oid: 2 },
      { pairIndex: 0, oid: 1 },
    ]);
    expect(() =>
      normalizeSpotCancelIntents([{ pairIndex: 0, oid: 1.5 }])
    ).toThrow('Invalid spot cancel order');
    expect(() =>
      normalizeSpotCancelIntents([{ pairIndex: -1, oid: 1 }])
    ).toThrow('Invalid spot cancel order');
    expect(() => normalizeSpotCancelIntents([])).toThrow(
      'At least one spot order is required'
    );
  });

  it('falls back to zero size decimals when meta is malformed', () => {
    const markets = buildSpotMarkets(
      {
        tokens: [
          { name: 'USDC', index: 0, szDecimals: 8 },
          { name: 'BAD', index: 1, szDecimals: ('x' as unknown) as number },
        ],
        universe: [{ name: '@1', index: 1, tokens: [1, 0] }],
      },
      null
    );
    expect(markets[0].szDecimals).toBe(0);
  });
});
