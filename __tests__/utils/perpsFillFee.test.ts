import { getFillFeeRates } from '@/utils/perps/fillFee';

const fill = { px: '10000', sz: '1', fee: '6.5', builderFee: '2' };

describe('historical fill fee rates', () => {
  it('preserves a historical 2 bps builder fee and derives the venue fee', () => {
    expect(getFillFeeRates(fill)).toEqual({
      builder: '0.02%',
      exchange: '0.05%',
    });
  });

  it('uses the recorded 4 bps fee for a newer fill', () => {
    expect(getFillFeeRates({ ...fill, fee: '8.5', builderFee: '4' })).toEqual({
      builder: '0.04%',
      exchange: '0.05%',
    });
  });

  it('uses aggregated fee amounts and weighted price, not an average of rates', () => {
    // Two fills: 1 * 10000 at 2 bps and 3 * 20000 at 4 bps.
    expect(
      getFillFeeRates({ px: '17500', sz: '4', fee: '57.5', builderFee: '26' })
    ).toEqual({
      builder: '0.04%',
      exchange: '0.05%',
    });
  });

  it('shows explicit zero fees as zero, including zero total fees', () => {
    expect(getFillFeeRates({ ...fill, fee: '0', builderFee: '0' })).toEqual({
      builder: '0.00%',
      exchange: '0.00%',
    });
  });

  it('supports signed size and maker rebates without taking absolute fees', () => {
    expect(getFillFeeRates({ ...fill, sz: '-1', fee: '1' })).toEqual({
      builder: '0.02%',
      exchange: '-0.01%',
    });
  });

  it.each([undefined, '', ' '])(
    'falls back to 0.04%% only for missing builderFee (%p)',
    (builderFee) => {
      expect(getFillFeeRates({ ...fill, builderFee })).toEqual({
        builder: '0.04%',
        exchange: '-',
      });
    }
  );

  it.each(['invalid', 'Infinity', '-1'])(
    'keeps an unknown builder fee (%p) unknown',
    (builderFee) => {
      expect(getFillFeeRates({ ...fill, builderFee })).toEqual({
        builder: '-',
        exchange: '-',
      });
    }
  );

  it.each([
    { px: '0' },
    { sz: '0' },
    { px: '-1' },
    { sz: 'NaN' },
    { px: 'Infinity' },
  ])('does not divide by invalid notional %p', (values) => {
    expect(getFillFeeRates({ ...fill, ...values })).toEqual({
      builder: '-',
      exchange: '-',
    });
  });

  it('can show a known builder fee when the total is unavailable', () => {
    expect(getFillFeeRates({ ...fill, fee: '' })).toEqual({
      builder: '0.02%',
      exchange: '-',
    });
  });

  it.each([
    ['3.4999999', '0.03%'],
    ['3.5', '0.04%'],
    ['3.9999999', '0.04%'],
  ])(
    'rounds only the final percentage for builder fee %s',
    (builderFee, expected) => {
      expect(getFillFeeRates({ ...fill, builderFee }).builder).toBe(expected);
    }
  );

  it('does not display a negative zero for a small venue rebate', () => {
    expect(getFillFeeRates({ ...fill, fee: '1.99' }).exchange).toBe('0.00%');
  });

  it('keeps a missing record unknown', () => {
    expect(getFillFeeRates(null)).toEqual({ builder: '-', exchange: '-' });
  });
});
