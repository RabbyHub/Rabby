import {
  getOpenInDesktopPolicy,
  GO_RABBY_ORIGIN,
} from '@/background/controller/provider/openInDesktopPolicy';

describe('openInDesktop origin policy', () => {
  it('allows go.rabby.io only in the browser-trusted top frame', () => {
    expect(getOpenInDesktopPolicy(GO_RABBY_ORIGIN, 0)).toEqual({
      source: 'go-rabby',
    });
  });

  it.each([undefined, 1, 42])(
    'rejects go.rabby.io outside the top frame (%s)',
    (frameId) => {
      expect(getOpenInDesktopPolicy(GO_RABBY_ORIGIN, frameId)).toBeNull();
    }
  );

  it.each(['https://debank.com', 'https://www.debank.com'])(
    'preserves Debank address behavior for %s',
    (origin) => {
      expect(getOpenInDesktopPolicy(origin)).toEqual({
        source: 'debank',
      });
    }
  );

  it.each([
    'http://go.rabby.io',
    'https://sub.go.rabby.io',
    'https://go.rabby.io.evil.test',
    'https://rabby.io',
    undefined,
  ])('rejects non-allowlisted origin %s', (origin) => {
    expect(getOpenInDesktopPolicy(origin, 0)).toBeNull();
  });
});
