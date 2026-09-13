import { isValidAddress } from '@ethereumjs/util';

const LEADING_ADDRESS_BOUNDARY_WHITESPACE = /^[ \t\r\n]+/;
const TRAILING_ADDRESS_BOUNDARY_WHITESPACE = /[ \t\r\n]+$/;

export const normalizeAddressInputBoundaryWhitespace = (value: string) => {
  const candidate = value
    .replace(LEADING_ADDRESS_BOUNDARY_WHITESPACE, '')
    .replace(TRAILING_ADDRESS_BOUNDARY_WHITESPACE, '');

  if (candidate === value || !isValidAddress(candidate)) {
    return value;
  }

  return candidate;
};

export const getNormalizedAddressInputAfterPaste = ({
  value,
  pastedText,
  selectionStart,
  selectionEnd,
}: {
  value: string;
  pastedText: string;
  selectionStart: number | null;
  selectionEnd: number | null;
}) => {
  const start = selectionStart ?? value.length;
  const end = selectionEnd ?? start;
  const nextValue = `${value.slice(0, start)}${pastedText}${value.slice(end)}`;
  const normalizedValue = normalizeAddressInputBoundaryWhitespace(nextValue);

  return normalizedValue === nextValue ? null : normalizedValue;
};
