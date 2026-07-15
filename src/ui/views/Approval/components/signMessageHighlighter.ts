import { isAddress } from 'viem';

export type SignMessageHighlightToken = {
  type: 'text' | 'url' | 'address';
  value: string;
  address?: string;
};

type TypedDataField = {
  name: string;
  type: string;
};

type TypedDataPayload = {
  primaryType?: string;
  types?: Record<string, TypedDataField[]>;
  message?: Record<string, unknown>;
};

const TOKEN_RE = /https?:\/\/[^\s"'<>]+|0x[a-fA-F0-9]{40}/gi;
const ADDRESS_RE = /0x[a-fA-F0-9]{40}/gi;
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

const normalizeTypedDataAddress = (value: unknown) => {
  if (typeof value !== 'string' || !/^(?:0x)?[0-9a-fA-F]{40}$/.test(value)) {
    return null;
  }

  return value.startsWith('0x') ? value : `0x${value}`;
};

const ARRAY_TYPE_RE = /^(.*)\[[0-9]*\]$/;

const markTypedDataAddresses = (
  value: unknown,
  type: string,
  types: Record<string, TypedDataField[]>,
  markers: Array<{ marker: string; value: string; address: string }>
): unknown => {
  const arrayType = type.match(ARRAY_TYPE_RE)?.[1];
  if (arrayType && Array.isArray(value)) {
    return value.map((item) =>
      markTypedDataAddresses(item, arrayType, types, markers)
    );
  }

  if (type === 'address') {
    const address = normalizeTypedDataAddress(value);
    if (address && typeof value === 'string') {
      const marker = `\u0000rabby-address-${markers.length}\u0000`;
      markers.push({ marker, value, address });
      return marker;
    }
    return value;
  }

  const fields = types[type];
  if (!fields || !value || typeof value !== 'object' || Array.isArray(value)) {
    return value;
  }

  const result = { ...(value as Record<string, unknown>) };
  fields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(result, field.name)) {
      result[field.name] = markTypedDataAddresses(
        result[field.name],
        field.type,
        types,
        markers
      );
    }
  });
  return result;
};

const appendTextToken = (
  tokens: SignMessageHighlightToken[],
  value: string
) => {
  if (!value) return;
  const previous = tokens[tokens.length - 1];
  if (previous?.type === 'text') {
    previous.value += value;
  } else {
    tokens.push({ type: 'text', value });
  }
};

const appendUrlTokens = (
  tokens: SignMessageHighlightToken[],
  value: string
) => {
  let cursor = 0;

  for (const match of value.matchAll(ADDRESS_RE)) {
    const address = match[0];
    const start = match.index || 0;
    const end = start + address.length;
    if (
      !isAddress(address) ||
      isHexChar(value[start - 1]) ||
      isHexChar(value[end])
    ) {
      continue;
    }

    if (start > cursor) {
      tokens.push({ type: 'url', value: value.slice(cursor, start) });
    }
    tokens.push({ type: 'address', value: address });
    cursor = end;
  }

  if (cursor < value.length) {
    tokens.push({ type: 'url', value: value.slice(cursor) });
  }
};

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
    if (isUrl) {
      appendUrlTokens(tokens, value);
    } else {
      tokens.push({ type: 'address', value });
    }
    cursor = end;
  }

  if (cursor < text.length) {
    tokens.push({ type: 'text', value: text.slice(cursor) });
  }

  return tokens.length ? tokens : [{ type: 'text', value: text }];
};

export const tokenizeSignTypedDataMessage = (
  typedData: TypedDataPayload,
  formattedMessage: string
): SignMessageHighlightToken[] => {
  const { message, primaryType, types } = typedData;
  const primaryFields = primaryType ? types?.[primaryType] : undefined;
  if (!message || !primaryType || !types || !primaryFields) {
    return [{ type: 'text', value: formattedMessage }];
  }

  const displayedMessage: Record<string, unknown> = {};
  primaryFields.forEach((field) => {
    displayedMessage[field.name] = message[field.name];
  });

  const markers: Array<{ marker: string; value: string; address: string }> = [];
  const markedMessage = markTypedDataAddresses(
    displayedMessage,
    primaryType,
    types,
    markers
  );
  const markedText = JSON.stringify(markedMessage, null, 4);
  const occurrences = markers
    .map((marker) => ({
      ...marker,
      encoded: JSON.stringify(marker.marker),
      index: markedText.indexOf(JSON.stringify(marker.marker)),
    }))
    .filter((marker) => marker.index >= 0)
    .sort((a, b) => a.index - b.index);

  const tokens: SignMessageHighlightToken[] = [];
  let cursor = 0;
  occurrences.forEach((occurrence) => {
    appendTextToken(tokens, `${markedText.slice(cursor, occurrence.index)}"`);
    tokens.push({
      type: 'address',
      value: occurrence.value,
      address: occurrence.address,
    });
    cursor = occurrence.index + occurrence.encoded.length - 1;
  });
  appendTextToken(tokens, markedText.slice(cursor));

  return tokens.map((token) => token.value).join('') === formattedMessage
    ? tokens
    : [{ type: 'text', value: formattedMessage }];
};
