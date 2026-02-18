import { getOriginFromUrl } from '@/utils';

declare const describe: any;
declare const it: any;
declare const expect: any;

describe('getOriginFromUrl', () => {
  it('returns origin for full URL', () => {
    expect(getOriginFromUrl('https://example.com/path')).toBe(
      'https://example.com'
    );
  });

  it('handles URL without protocol', () => {
    expect(getOriginFromUrl('exchange.pancakeswap.finance/blabla')).toBe(
      'https://exchange.pancakeswap.finance'
    );
  });

  it('returns empty string for invalid input', () => {
    expect(getOriginFromUrl('not a url')).toBe('');
  });
});
