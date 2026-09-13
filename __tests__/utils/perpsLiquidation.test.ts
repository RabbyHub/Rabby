import {
  calLiquidationPrice,
  resolveProjectedLiquidationPrice,
} from '@/ui/views/Perps/liquidation';

// args handed to an injected calculator, so here we assert the price those same
// args produce.
const expectedFrom = (
  price: number,
  margin: number,
  direction: 'Long' | 'Short',
  size: number,
  notional: number,
  maxLeverage: number,
  pxDecimals = 2
) =>
  calLiquidationPrice(
    price,
    margin,
    direction,
    size,
    notional,
    maxLeverage
  ).toFixed(pxDecimals);

const resolve = (overrides = {}) =>
  resolveProjectedLiquidationPrice({
    baseSize: '2',
    crossMarginAvailableAfterMaintenance: 990,
    currentPosition: null,
    entryPrice: '100',
    leverage: 10,
    marginMode: 'isolated' as const,
    maxLeverage: 20,
    pxDecimals: 2,
    side: 'buy' as const,
    ...overrides,
  });

describe('resolveProjectedLiquidationPrice (parity with rabby-mobile)', () => {
  it('new isolated position -> (100, 20, Long, 2, 200, 20)', () => {
    expect(resolve()?.liquidationPrice).toBe(
      expectedFrom(100, 20, 'Long', 2, 200, 20)
    );
  });

  it('same-side growth uses weighted entry -> (280/3, 28, Long, 3, 280, 20)', () => {
    expect(
      resolve({
        currentPosition: { entryPx: '80', marginUsed: '8', szi: '1' },
      })?.liquidationPrice
    ).toBe(expectedFrom(280 / 3, 28, 'Long', 3, 280, 20));
  });

  it('cross mode draws on the account balance, not the order margin', () => {
    // Same order, two modes: cross must use the 30 account balance while
    // isolated uses the order margin (200 notional / 10x = 20).
    const facts = { crossMarginAvailableAfterMaintenance: 30 };
    expect(resolve({ ...facts, marginMode: 'cross' })?.liquidationPrice).toBe(
      expectedFrom(100, 30, 'Long', 2, 200, 20)
    );
    expect(
      resolve({ ...facts, marginMode: 'isolated' })?.liquidationPrice
    ).toBe(expectedFrom(100, 20, 'Long', 2, 200, 20));
  });

  it('charges the existing maintenance margin once when cross adds to a position', () => {
    // Balance 100 already has the 1-unit position's maintenance margin taken
    // off, so it is added back (1 * 100 * 0.025 = 2.5) before the formula
    // charges maintenance on the merged 3-unit notional. Baseline is the fill
    // price, not the 280/3 weighted entry, because the balance carries
    // unrealised PnL and is measured at the current price.
    expect(
      resolve({
        marginMode: 'cross',
        crossMarginAvailableAfterMaintenance: 100,
        currentPosition: { entryPx: '80', marginUsed: '8', szi: '1' },
      })?.liquidationPrice
    ).toBe(expectedFrom(100, 102.5, 'Long', 3, 300, 20));
  });

  it('adds the released maintenance margin back when cross flips direction', () => {
    // The old 1-unit short is closed, so its maintenance margin is freed
    // (20 + 1 * 100 * 0.025) and only the 1-unit remainder is charged.
    expect(
      resolve({
        marginMode: 'cross',
        crossMarginAvailableAfterMaintenance: 20,
        currentPosition: { entryPx: '80', marginUsed: '8', szi: '-1' },
      })?.liquidationPrice
    ).toBe(expectedFrom(100, 22.5, 'Long', 1, 100, 20));
  });

  it('hides the estimate when the projected price is not positive', () => {
    // A 990 balance puts the long liquidation below zero.
    expect(resolve({ marginMode: 'cross' })).toBeNull();
  });

  it('flip through zero leaves the remainder -> (100, 10, Long, 1, 100, 20)', () => {
    expect(resolve({ currentPosition: { szi: '-1' } })?.liquidationPrice).toBe(
      expectedFrom(100, 10, 'Long', 1, 100, 20)
    );
  });

  it('an opposite order that only reduces gets no estimate', () => {
    expect(resolve({ currentPosition: { szi: '-3' } })).toBeNull();
  });

  it('fails closed when the cross balance is unavailable', () => {
    expect(
      resolve({
        crossMarginAvailableAfterMaintenance: null,
        marginMode: 'cross',
      })
    ).toBeNull();
  });

  const nvda = {
    crossMarginAvailableAfterMaintenance: 35.08059422,
    currentPosition: null,
    entryPrice: '223.88',
    leverage: 20,
    marginMode: 'cross' as const,
    maxLeverage: 20,
    pxDecimals: 2,
  };

  it('reproduces the Unified NVDA 37% long and short prices', () => {
    expect(
      resolveProjectedLiquidationPrice({
        ...nvda,
        baseSize: '1.13',
        side: 'buy',
      })?.liquidationPrice
    ).toBe('197.78');
    expect(
      resolveProjectedLiquidationPrice({
        ...nvda,
        baseSize: '1.13',
        side: 'sell',
      })?.liquidationPrice
    ).toBe('248.71');
  });

  it('keeps the Unified NVDA 2% long unpriced and the short finite', () => {
    expect(
      resolveProjectedLiquidationPrice({
        ...nvda,
        baseSize: '0.061',
        side: 'buy',
      })
    ).toBeNull();
    expect(
      resolveProjectedLiquidationPrice({
        ...nvda,
        baseSize: '0.061',
        side: 'sell',
      })?.liquidationPrice
    ).toBe('779.48');
  });

  it('assumeSufficientMargin floors a deficient cross balance at the order margin', () => {
    // A 5 balance cannot fund the 20 order margin: unflagged the estimate is
    // hidden (margin_available <= 0), flagged it matches the isolated one.
    const facts = {
      marginMode: 'cross' as const,
      crossMarginAvailableAfterMaintenance: 5,
    };
    expect(resolve(facts)).toBeNull();
    expect(
      resolve({ ...facts, assumeSufficientMargin: true })?.liquidationPrice
    ).toBe(expectedFrom(100, 20, 'Long', 2, 200, 20));
  });

  it('assumeSufficientMargin never lowers a sufficient cross balance', () => {
    expect(
      resolve({
        marginMode: 'cross',
        crossMarginAvailableAfterMaintenance: 30,
        assumeSufficientMargin: true,
      })?.liquidationPrice
    ).toBe(expectedFrom(100, 30, 'Long', 2, 200, 20));
  });

  // Growing an existing 1 @ 80 long by 2 @ 100 at 10x. The order adds 20 of
  // margin; the existing leg keeps 1*100/(2*20) = 2.5 of maintenance margin
  // locked, which cross adds back on top of whatever the free balance is.
  const growth = {
    marginMode: 'cross' as const,
    currentPosition: { entryPx: '80', marginUsed: '8', szi: '1' },
    assumeSufficientMargin: true,
  };

  it('assumeSufficientMargin leaves a free balance that covers the added margin', () => {
    // 22.5 free already funds the 20, so the estimate keeps the real balance:
    // 22.5 + 2.5 = 25. Never lowered, never raised.
    expect(
      resolve({ ...growth, crossMarginAvailableAfterMaintenance: 22.5 })
        ?.liquidationPrice
    ).toBe(expectedFrom(100, 25, 'Long', 3, 300, 20));
  });

  it('assumeSufficientMargin floors growth on the free balance, under the maintenance add-back', () => {
    // 18 free cannot fund the 20: the account has to be topped up to 20 before
    // the 2.5 of still-locked maintenance is added back, giving 22.5.
    //
    // The interval matters — 18 is chosen so that every wrong floor is a
    // different number: flooring the *sum* leaves 18 + 2.5 = 20.5 untouched
    // (the add-back masks the deficit outright), and flooring at the merged
    // position's margin (3 @ 100 at 10x = 30) invents margin for the existing
    // leg the balance already carries.
    expect(
      resolve({ ...growth, crossMarginAvailableAfterMaintenance: 18 })
        ?.liquidationPrice
    ).toBe(expectedFrom(100, 22.5, 'Long', 3, 300, 20));
  });

  it('assumeSufficientMargin floors a flip on the balance the closed leg releases', () => {
    // Flipping a 1 @ 80 long with a 2 @ 100 sell leaves a 1 short needing 10.
    // The old leg is closed, so its 2.5 of maintenance is released and spendable
    // — 8 free plus 2.5 backs the new leg with 10.5 and needs no top-up.
    expect(
      resolve({
        ...growth,
        side: 'sell',
        crossMarginAvailableAfterMaintenance: 8,
      })?.liquidationPrice
    ).toBe(expectedFrom(100, 10.5, 'Short', 1, 100, 20));
  });

  it('assumeSufficientMargin still fails closed on an unavailable balance', () => {
    expect(
      resolve({
        marginMode: 'cross',
        crossMarginAvailableAfterMaintenance: null,
        assumeSufficientMargin: true,
      })
    ).toBeNull();
  });

  it('distinguishes the MSFT unpriced long from its finite short', () => {
    const msft = {
      crossMarginAvailableAfterMaintenance: 36.2449065,
      currentPosition: null,
      entryPrice: '509.21',
      leverage: 20,
      marginMode: 'cross' as const,
      maxLeverage: 20,
      pxDecimals: 2,
    };
    expect(
      resolveProjectedLiquidationPrice({
        ...msft,
        baseSize: '0.023',
        side: 'buy',
      })
    ).toBeNull();
    expect(
      resolveProjectedLiquidationPrice({
        ...msft,
        baseSize: '0.023',
        side: 'sell',
      })?.liquidationPrice
    ).toBe('2034.22');
  });
});
