// The module under test pulls two formatter barrels that boot the extension
// runtime on import; only their number formatting is on its path.
jest.mock('@/ui/utils', () => ({
  splitNumberByStep: jest.requireActual('@/ui/utils/number').splitNumberByStep,
}));

// Not `requireActual`: that barrel reaches `@/constant`, which touches
// `browser.storage` at import time. Both helpers are one-liners, restated here
// verbatim from `@/ui/views/Perps/utils`.
jest.mock('@/ui/views/Perps/utils', () => ({
  formatPerpsPct: (v: number) => `${(v * 100).toFixed(2)}%`,
  calculateDistanceToLiquidation: (
    liquidationPrice?: number | string,
    markPrice?: number | string
  ) => {
    const liqPx = Number(liquidationPrice || 0);
    const markPx = Number(markPrice || 0);
    if (markPx === 0) return 0;
    return Math.abs((liqPx - markPx) / markPx);
  },
}));

import { formatLiquidationDistance } from '@/ui/views/DesktopPerps/liquidationDistance';

describe('liquidation distance', () => {
  it('is negative when liquidation sits below the mark price', () => {
    // A long at 100,000 liquidating at 92,000: 8,000 to go, downward.
    expect(formatLiquidationDistance(92000, 100000, 2)).toBe('-8.00%(-8,000)');
  });

  it('is positive when liquidation sits above the mark price', () => {
    // The short mirror image: liquidation is reached by the price rising.
    expect(formatLiquidationDistance(108000, 100000, 2)).toBe('8.00%(8,000)');
  });

  it('never lets the percentage and the absolute gap disagree in sign', () => {
    for (const liq of [1, 50, 99.99, 100.01, 150, 1000]) {
      const out = formatLiquidationDistance(liq, 100, 2);
      const pctNegative = out.startsWith('-');
      const gapNegative = out.slice(out.indexOf('(') + 1).startsWith('-');
      expect(pctNegative).toBe(gapNegative);
    }
  });

  it('rounds the gap to the market price decimals', () => {
    expect(formatLiquidationDistance(92000.126, 100000, 2)).toContain(
      '(-7,999.87)'
    );
    expect(formatLiquidationDistance(92000.126, 100000, 0)).toContain(
      '(-8,000)'
    );
  });

  it('returns nothing rather than dividing by an unknown mark price', () => {
    expect(formatLiquidationDistance(92000, 0, 2)).toBe('');
    expect(formatLiquidationDistance(92000, null, 2)).toBe('');
  });

  it('returns nothing when there is no liquidation price', () => {
    expect(formatLiquidationDistance(null, 100000, 2)).toBe('');
    expect(formatLiquidationDistance(0, 100000, 2)).toBe('');
  });
});
