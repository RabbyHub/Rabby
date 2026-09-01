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

  // An existing position's margin is already real, so the floor is the margin
  // this order *adds*. Both cases below sit between the added margin (2 @ 100
  // at 10x = 20) and the merged one (3 @ 100 at 10x = 30), which is the only
  // window where the two floors disagree.
  const growth = {
    marginMode: 'cross' as const,
    currentPosition: { entryPx: '80', marginUsed: '8', szi: '1' },
    assumeSufficientMargin: true,
  };

  it('assumeSufficientMargin leaves a balance that covers the added margin alone', () => {
    // backingMargin = 22.5 + 1*100/(2*20) = 25, above the 20 it must fund.
    expect(
      resolve({ ...growth, crossMarginAvailableAfterMaintenance: 22.5 })
        ?.liquidationPrice
    ).toBe(expectedFrom(100, 25, 'Long', 3, 300, 20));
  });

  it('assumeSufficientMargin floors growth at the added margin, not the merged one', () => {
    // backingMargin = 2.5 + 2.5 = 5: funded up to the order's own 20, never to
    // the merged position's 30 — that would quote a safer price than the
    // account can actually hold.
    expect(
      resolve({ ...growth, crossMarginAvailableAfterMaintenance: 2.5 })
        ?.liquidationPrice
    ).toBe(expectedFrom(100, 20, 'Long', 3, 300, 20));
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
