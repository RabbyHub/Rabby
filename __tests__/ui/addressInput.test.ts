import {
  getNormalizedAddressInputAfterPaste,
  normalizeAddressInputBoundaryWhitespace,
} from '@/ui/utils/addressInput';

const VALID_ADDRESS = '0x341a1fBD51825E5a107DB54cCb3166DeBA145479';

describe('normalizeAddressInputBoundaryWhitespace', () => {
  it.each([
    ` ${VALID_ADDRESS}`,
    `${VALID_ADDRESS} `,
    `\n${VALID_ADDRESS}\n`,
    `\r\n${VALID_ADDRESS}\r\n`,
    `\t${VALID_ADDRESS}\t`,
    ` \t\r\n${VALID_ADDRESS}\n\r\t `,
  ])('removes supported boundary whitespace from a valid address', (value) => {
    expect(normalizeAddressInputBoundaryWhitespace(value)).toBe(VALID_ADDRESS);
  });

  it('preserves a valid address when no normalization is needed', () => {
    expect(normalizeAddressInputBoundaryWhitespace(VALID_ADDRESS)).toBe(
      VALID_ADDRESS
    );
  });

  it.each([
    ' \n0x1234\t ',
    ` ${VALID_ADDRESS.slice(0, -1)}Z `,
    ` ${VALID_ADDRESS.slice(0, 12)}\n${VALID_ADDRESS.slice(12)} `,
    ` ethereum:${VALID_ADDRESS} `,
    ` Address: ${VALID_ADDRESS} `,
    ` (${VALID_ADDRESS}) `,
    ' rabby.eth ',
  ])('keeps malformed or non-address input unchanged', (value) => {
    expect(normalizeAddressInputBoundaryWhitespace(value)).toBe(value);
  });

  it.each([
    `\u00a0${VALID_ADDRESS}\u00a0`,
    `\u200b${VALID_ADDRESS}\u200b`,
    `\ufeff${VALID_ADDRESS}\ufeff`,
    `\u3000${VALID_ADDRESS}\u3000`,
  ])('does not remove unsupported Unicode whitespace', (value) => {
    expect(normalizeAddressInputBoundaryWhitespace(value)).toBe(value);
  });
});

describe('getNormalizedAddressInputAfterPaste', () => {
  it('normalizes the complete pasted value before maxLength can truncate it', () => {
    expect(
      getNormalizedAddressInputAfterPaste({
        value: '',
        pastedText: ` \t\r\n${VALID_ADDRESS}\n\r\t `,
        selectionStart: 0,
        selectionEnd: 0,
      })
    ).toBe(VALID_ADDRESS);
  });

  it('respects the current selection when building the pasted value', () => {
    expect(
      getNormalizedAddressInputAfterPaste({
        value: 'replace me',
        pastedText: `\n${VALID_ADDRESS}\t`,
        selectionStart: 0,
        selectionEnd: 'replace me'.length,
      })
    ).toBe(VALID_ADDRESS);
  });

  it.each([
    {
      value: '',
      pastedText: VALID_ADDRESS,
      selectionStart: 0,
      selectionEnd: 0,
    },
    {
      value: 'prefix',
      pastedText: ` ${VALID_ADDRESS} `,
      selectionStart: 6,
      selectionEnd: 6,
    },
    {
      value: '',
      pastedText: ` ${VALID_ADDRESS.slice(0, -1)} `,
      selectionStart: 0,
      selectionEnd: 0,
    },
    {
      value: '',
      pastedText: ' rabby.eth ',
      selectionStart: 0,
      selectionEnd: 0,
    },
  ])('does not intercept unchanged or invalid pasted input', (params) => {
    expect(getNormalizedAddressInputAfterPaste(params)).toBeNull();
  });
});
