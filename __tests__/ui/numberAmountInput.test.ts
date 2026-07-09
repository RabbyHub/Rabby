import {
  AMOUNT_INPUT_NUMBER_RE,
  formatTokenAmountInput,
  normalizeAmountInput,
  truncateAmountToDecimals,
} from '@/ui/utils/number';
import { normalizeInputNumber } from '@/constant/regexp';

describe('amount input formatting', () => {
  it('keeps USD input within two decimal places', () => {
    expect(formatTokenAmountInput('1.123', 2)).toBe('1.12');
    expect(formatTokenAmountInput('1.', 2)).toBe('1.');
  });

  it('keeps input within the token decimals limit', () => {
    expect(formatTokenAmountInput('1.1234567', 6)).toBe('1.123456');
    expect(formatTokenAmountInput('0.0000000000000000009', 18)).toBe(
      '0.000000000000000000'
    );
  });

  it('preserves valid intermediate decimal input', () => {
    expect(formatTokenAmountInput('', 6)).toBe('');
    expect(formatTokenAmountInput('.', 6)).toBe('.');
    expect(formatTokenAmountInput('1.', 6)).toBe('1.');
    expect(formatTokenAmountInput('.123', 6)).toBe('.123');
  });

  it('removes fractional input for integer tokens', () => {
    expect(formatTokenAmountInput('10.1', 0)).toBe('10');
    expect(truncateAmountToDecimals('10.', 0)).toBe('10');
  });

  it('normalizes comma decimals before truncating', () => {
    expect(normalizeAmountInput('12,34567')).toBe('12.34567');
    expect(formatTokenAmountInput('12,34567', 4)).toBe('12.3456');
    expect(normalizeInputNumber(formatTokenAmountInput('12,34567', 4))).toBe(
      '12.3456'
    );
  });

  it('keeps grouped comma input compatible with the original validator', () => {
    expect(formatTokenAmountInput('1,234.567', 2)).toBe('1,234.56');
    expect(normalizeInputNumber(formatTokenAmountInput('1,234.567', 2))).toBe(
      '1234.56'
    );
  });

  it('keeps the original leading-zero input behavior', () => {
    expect(normalizeInputNumber(formatTokenAmountInput('00007', 6))).toBeNull();
    expect(normalizeInputNumber(formatTokenAmountInput('07', 6))).toBe('7');
  });

  it('does not truncate when token decimals are unknown', () => {
    expect(formatTokenAmountInput('1.123456789')).toBe('1.123456789');
  });

  it('leaves malformed input for caller-side rejection', () => {
    ['1e3', '-1', '+1', '1..2', 'abc', '1 2', '1,23,4'].forEach((input) => {
      const formatted = formatTokenAmountInput(input, 6);
      expect(AMOUNT_INPUT_NUMBER_RE.test(formatted)).toBe(false);
    });
  });
});
