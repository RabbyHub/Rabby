import {
  closeQuantitySummary,
  formatLiquidationGap,
} from '@/ui/views/Perps/positionDisplay';

describe('formatLiquidationGap', () => {
  it('is negative when liquidation sits below the mark', () => {
    expect(formatLiquidationGap(92000, 100000)).toBe('-8.00%');
  });

  it('is positive when liquidation sits above the mark', () => {
    expect(formatLiquidationGap('108000', '100000')).toBe('+8.00%');
  });

  it('shows 0.00% for a gap that rounds to zero', () => {
    expect(formatLiquidationGap(100.001, 100)).toBe('0.00%');
  });

  it('treats a nonpositive liquidation price as zero', () => {
    expect(formatLiquidationGap('0', 100)).toBe('-100.00%');
    expect(formatLiquidationGap(-5, 100)).toBe('-100.00%');
  });

  it('returns -- when either side is missing or the mark is not positive', () => {
    expect(formatLiquidationGap(null, 100)).toBe('--');
    expect(formatLiquidationGap('', 100)).toBe('--');
    expect(formatLiquidationGap(90, 0)).toBe('--');
    expect(formatLiquidationGap(90, undefined)).toBe('--');
  });
});

describe('closeQuantitySummary', () => {
  it('keeps the raw size at 100%', () => {
    expect(closeQuantitySummary('0.521', 100, 3, 2000)).toEqual({
      quantity: '0.521',
      notional: '1042.00',
    });
  });

  it('rounds a partial close to szDecimals', () => {
    expect(closeQuantitySummary('1.5', 50, 2, 100)).toEqual({
      quantity: '0.75',
      notional: '75.00',
    });
    expect(closeQuantitySummary('2', 33, 3, 10)).toEqual({
      quantity: '0.660',
      notional: '6.60',
    });
  });
});
