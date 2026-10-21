import {
  assertGasAccountSignText,
  isInvalidGasAccountSignTextError,
} from '@/utils/gasAccount';

const addr = '0x000000000000000000000000000000000000dEaD';
const valid = `Gas Account wants you to sign in with your \naddress:${addr.toLowerCase()}\nnonce:0`;

describe('assertGasAccountSignText', () => {
  it('accepts the login message for the same address', () => {
    expect(assertGasAccountSignText(valid, addr)).toBe(valid);
  });

  it.each([
    ['safe tx hash', `0x${'ab'.repeat(32)}`],
    ['other address', valid.replace('dead', 'beef')],
    ['prefixed junk', `x${valid}`],
    ['non-string', undefined],
  ])('rejects %s', (_, text) => {
    expect(() => assertGasAccountSignText(text, addr)).toThrow();
  });
});

describe('isInvalidGasAccountSignTextError', () => {
  it('matches the thrown error and its serialized background form', () => {
    let thrown: unknown;
    try {
      assertGasAccountSignText('0x', addr);
    } catch (e) {
      thrown = e;
    }
    expect(isInvalidGasAccountSignTextError(thrown)).toBe(true);
    expect(
      isInvalidGasAccountSignTextError({
        message: (thrown as Error).message,
      })
    ).toBe(true);
    expect(isInvalidGasAccountSignTextError(new Error('other'))).toBe(false);
    expect(isInvalidGasAccountSignTextError(undefined)).toBe(false);
  });
});
