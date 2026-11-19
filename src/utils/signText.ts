import { addHexPrefix, padToEven, stripHexPrefix } from '@ethereumjs/util';

export const normalizeSignText = (message: string): string => {
  const stripped = stripHexPrefix(message);
  // Match the signer's byte conversion before the message is reviewed.
  return /^[0-9a-f]+$/i.test(stripped)
    ? addHexPrefix(padToEven(stripped))
    : message;
};

export const hex2Text = (hex: string): string => {
  if (!/^0x[0-9a-fA-F]*$/.test(hex)) return hex;
  const normalized = normalizeSignText(hex);
  try {
    return decodeURIComponent(normalized.slice(2).replace(/../g, '%$&'));
  } catch {
    return normalized;
  }
};
