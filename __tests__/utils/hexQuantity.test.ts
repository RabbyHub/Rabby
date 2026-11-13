import BigNumber from 'bignumber.js';
import { intToHex } from '@ethereumjs/util';

import { toHexQuantity } from '@/utils/hexQuantity';

describe('toHexQuantity', () => {
  test.each([0, 1, 21000, 1_000_000_000, 16_000_000_000, 2 ** 53 - 1])(
    'matches intToHex for safe integer %p',
    (value) => {
      expect(toHexQuantity(value)).toBe(intToHex(value));
    }
  );

  test.each([
    // RABBY-5QC: custom gas price on the main signing page
    12345678000000000,
    // RABBY-5XK: custom network gas market
    9372974029086880,
    2 ** 64,
    1e30,
  ])('converts %p above Number.MAX_SAFE_INTEGER exactly', (value) => {
    expect(() => intToHex(value)).toThrow('Received an invalid integer type');

    const hex = toHexQuantity(value);

    expect(hex).toMatch(/^0x[0-9a-f]+$/);
    expect(BigInt(hex)).toBe(BigInt(value));
    expect(Number(hex)).toBe(value);
  });

  test('rounds fractional wei to the nearest integer like Math.round', () => {
    expect(toHexQuantity(1.4)).toBe('0x1');
    expect(toHexQuantity(1.5)).toBe('0x2');
    // 1.1 gwei * 1e9 in floating point
    expect(toHexQuantity(1.1 * 1e9)).toBe(intToHex(1_100_000_000));
    expect(toHexQuantity('1.5')).toBe('0x2');
    expect(toHexQuantity(new BigNumber('1.4'))).toBe('0x1');
  });

  test('keeps full precision for string, bigint and BigNumber input', () => {
    // 2^53 + 1 is not representable as a JS number
    const exact = '0x20000000000001';

    expect(toHexQuantity('9007199254740993')).toBe(exact);
    expect(toHexQuantity('0x20000000000001')).toBe(exact);
    expect(toHexQuantity('0X20000000000001')).toBe(exact);
    expect(toHexQuantity(BigInt('9007199254740993'))).toBe(exact);
    expect(toHexQuantity(new BigNumber('9007199254740993'))).toBe(exact);
  });

  test('returns a canonical quantity', () => {
    expect(toHexQuantity('0x00ff')).toBe('0xff');
    expect(toHexQuantity('0xFF')).toBe('0xff');
    expect(toHexQuantity(-0)).toBe('0x0');
  });

  test.each([
    NaN,
    Infinity,
    -Infinity,
    -1,
    -0.5,
    '',
    '0x',
    'abc',
    '-1',
    'Infinity',
    BigInt(-1),
    new BigNumber(NaN),
    new BigNumber(-1),
  ])('fails closed on %p', (value) => {
    expect(() => toHexQuantity(value)).toThrow('Invalid hex quantity');
  });
});
