import { createRequire } from 'module';
import { hex2Text, normalizeSignText } from '@/utils/signText';

const keyringRequire = createRequire(
  require.resolve('@rabby-wallet/eth-simple-keyring')
);
const signerRequire = createRequire(
  keyringRequire.resolve('@metamask/eth-sig-util')
);
const { toBuffer } = signerRequire('@ethereumjs/util');

describe('personal-sign byte normalization and display', () => {
  test.each([
    ['0x415', '0x0415', '\x04\x15'],
    ['415', '0x0415', '\x04\x15'],
    ['0x5', '0x05', '\x05'],
    ['0x00', '0x00', '\x00'],
    ['0x7f', '0x7f', '\x7f'],
    ['0x4109420a430d44', '0x4109420a430d44', 'A\tB\nC\rD'],
    ['0x4135', '0x4135', 'A5'],
    ['0x4142', '0x4142', 'AB'],
    ['0xE4BDA0E5A5BD', '0xE4BDA0E5A5BD', '你好'],
    ['0xf09f9880', '0xf09f9880', '😀'],
    ['0xfff', '0x0fff', '0x0fff'],
    ['0xff', '0xff', '0xff'],
    ['0x', '0x', ''],
  ])(
    'reviews the same bytes the existing signer uses for %s',
    (input, normalized, displayed) => {
      expect(normalizeSignText(input)).toBe(normalized);
      expect(hex2Text(normalized)).toBe(displayed);
      expect(hex2Text(input.startsWith('0x') ? input : normalized)).toBe(
        displayed
      );
      expect(toBuffer(normalized)).toEqual(
        toBuffer(input.startsWith('0x') ? input : `0x${input}`)
      );
      if (displayed !== normalized) {
        expect(Buffer.from(displayed, 'utf8')).toEqual(toBuffer(normalized));
      }
    }
  );

  test.each(['', 'Sign in to Rabby\nNonce: 123', '你好', '0x4Z1', '0X415'])(
    'preserves non-hex text %j',
    (input) => {
      expect(normalizeSignText(input)).toBe(input);
      expect(hex2Text(input)).toBe(input);
    }
  );
});
