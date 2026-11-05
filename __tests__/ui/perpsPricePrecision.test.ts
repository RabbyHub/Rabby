import {
  formatTpOrSlPrice,
  validatePriceInput,
} from '@/ui/views/Perps/pricePrecision';

describe('formatTpOrSlPrice', () => {
  it.each([
    // [price, szDecimals, expected]
    [0.0946160001, 0, '0.094616'], // DOGE: leading zeros are not significant
    [0.0821279, 0, '0.082127'],
    [0.00012345678, 0, '0.000123'], // capped by 6 - szDecimals decimals
    [0.123456, 1, '0.12345'],
    [1.234567, 2, '1.2345'],
    [1.0012345, 0, '1.0012'], // zeros after a non-zero digit do count
    [12345.67, 0, '12345'],
    [123456.7, 0, '123456'], // any integer is allowed
    [100.061728, 2, '100.06'],
    [0.5, 0, '0.5'],
  ])('%p (szDecimals %p) -> %p', (price, szDecimals, expected) => {
    const formatted = formatTpOrSlPrice(price, szDecimals);
    expect(formatted).toBe(expected);
    expect(validatePriceInput(formatted, szDecimals)).toBe(true);
  });
});
