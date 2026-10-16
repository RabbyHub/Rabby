import { getRabbyFillFeeRate } from '@/utils/perps/fillFee';

const fill = { px: '10000', sz: '1', builderFee: '2' };

describe('historical Rabby fee display', () => {
  it.each([
    ['2', '0.02%'],
    ['4', '0.04%'],
  ])('accepts the recorded Rabby tier %s', (builderFee, expected) => {
    expect(getRabbyFillFeeRate({ ...fill, builderFee })).toBe(expected);
  });

  it('uses the supplied aggregate notional before display rounding', () => {
    expect(
      getRabbyFillFeeRate({ px: '17500', sz: '4', builderFee: '26' })
    ).toBe('0.04%');
  });

  it.each(['0', '-0', '1', '3', '6', '10', '100'])(
    'falls back for zero or another platform rate (%s)',
    (builderFee) => {
      expect(getRabbyFillFeeRate({ ...fill, builderFee })).toBe('0.04%');
    }
  );

  it.each([undefined, '', ' ', 'invalid', 'NaN', 'Infinity', '-1'])(
    'falls back for missing or invalid builderFee (%p)',
    (builderFee) => {
      expect(getRabbyFillFeeRate({ ...fill, builderFee })).toBe('0.04%');
    }
  );

  it.each([
    { px: '0' },
    { sz: '0' },
    { px: '-1' },
    { sz: 'NaN' },
    { px: 'Infinity' },
    { px: '' },
  ])('falls back for invalid notional %p', (values) => {
    expect(getRabbyFillFeeRate({ ...fill, ...values })).toBe('0.04%');
  });

  it.each([
    ['1.4999999', '0.04%'],
    ['1.5', '0.02%'],
    ['2.4999999', '0.02%'],
    ['2.5', '0.04%'],
    ['3.4999999', '0.04%'],
    ['3.5', '0.04%'],
    ['4.4999999', '0.04%'],
    ['4.5', '0.04%'],
  ])(
    'strictly matches after two-decimal half-up rounding (%s)',
    (builderFee, expected) => {
      expect(getRabbyFillFeeRate({ ...fill, builderFee })).toBe(expected);
    }
  );

  it('supports signed size without changing the builder fee', () => {
    const input = { ...fill, sz: '-1' };
    expect(getRabbyFillFeeRate(input)).toBe('0.02%');
    expect(input.builderFee).toBe('2');
  });

  it.each(['0', '-10', 'invalid'])(
    'does not use the total/exchange fee (%s)',
    (fee) => {
      const input = { ...fill, fee };
      expect(getRabbyFillFeeRate(input)).toBe('0.02%');
      expect(input.fee).toBe(fee);
    }
  );

  it.each([undefined, null])('falls back for a missing record %p', (record) => {
    expect(getRabbyFillFeeRate(record)).toBe('0.04%');
  });
});
