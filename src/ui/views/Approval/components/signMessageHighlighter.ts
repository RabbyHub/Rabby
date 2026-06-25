import { isAddress } from 'viem';

export type SignMessageHighlightToken = {
  type: 'text' | 'url' | 'address';
  value: string;
};

const TOKEN_RE = /https?:\/\/[^\s"'<>]+|0x[a-fA-F0-9]{40}/gi;
const HEX_CHAR_RE = /[0-9a-fA-F]/;
const URL_TRAILING_PUNCTUATION_RE = /[\]),.;:!?}]+$/;

const isValidUrl = (value: string) => {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !!url.hostname;
  } catch {
    return false;
  }
};

const isHexChar = (value?: string) => !!value && HEX_CHAR_RE.test(value);

export const tokenizeSignMessageText = (
  text: string
): SignMessageHighlightToken[] => {
  const tokens: SignMessageHighlightToken[] = [];
  let cursor = 0;

  for (const match of text.matchAll(TOKEN_RE)) {
    const raw = match[0];
    const start = match.index || 0;
    const isUrl = /^https?:\/\//i.test(raw);
    const value = isUrl ? raw.replace(URL_TRAILING_PUNCTUATION_RE, '') : raw;
    const end = start + value.length;

    if (isUrl ? !isValidUrl(value) : !isAddress(value)) {
      continue;
    }

    if (!isUrl && (isHexChar(text[start - 1]) || isHexChar(text[end]))) {
      continue;
    }

    if (start > cursor) {
      tokens.push({ type: 'text', value: text.slice(cursor, start) });
    }
    tokens.push({ type: isUrl ? 'url' : 'address', value });
    cursor = end;
  }

  if (cursor < text.length) {
    tokens.push({ type: 'text', value: text.slice(cursor) });
  }

  return tokens.length ? tokens : [{ type: 'text', value: text }];
};
