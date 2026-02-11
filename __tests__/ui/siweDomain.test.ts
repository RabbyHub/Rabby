import { checkSIWEDomain } from '@/ui/utils/siwe';

declare const describe: any;
declare const it: any;
declare const expect: any;

describe('checkSIWEDomain', () => {
  it('returns true when parsed domain matches origin host', () => {
    const parsedMessage: any = { domain: 'example.com' };
    expect(checkSIWEDomain('https://example.com', parsedMessage)).toBe(true);
  });

  it('returns false when origin is not a valid URL', () => {
    const parsedMessage: any = { domain: 'example.com' };
    expect(checkSIWEDomain('not a url', parsedMessage)).toBe(false);
  });
});
