import type { ContextActionData } from '@rabby-wallet/rabby-security-engine/dist/rules';
import { extractSignMessageUrls } from './signMessageHighlighter';

const normalizeHostname = (value: string) => {
  try {
    const url = new URL(
      /^[a-z][a-z\d+.-]*:\/\//i.test(value) ? value : `https://${value}`
    );
    return url.hostname.toLowerCase().replace(/\.+$/, '');
  } catch {
    return null;
  }
};

export const extractSignMessageHostnames = (message: string) =>
  Array.from(
    new Set(
      extractSignMessageUrls(message)
        .map(normalizeHostname)
        .filter((hostname): hostname is string => !!hostname)
    )
  );

export const hasSignMessageOriginMismatch = (
  message: string,
  origin: string
) => {
  const originHostname = normalizeHostname(origin);
  return originHostname
    ? extractSignMessageHostnames(message).some(
        (hostname) => hostname !== originHostname
      )
    : false;
};

export const addSignMessageOriginFallback = (
  ctx: ContextActionData,
  {
    isUnparsedAction,
    isInternalOrigin,
    message,
    origin,
  }: {
    isUnparsedAction: boolean;
    isInternalOrigin: boolean;
    message: string;
    origin: string;
  }
): ContextActionData => {
  if (
    !isUnparsedAction ||
    isInternalOrigin ||
    !hasSignMessageOriginMismatch(message, origin)
  ) {
    return ctx;
  }

  return {
    ...ctx,
    verifyAddress: {
      allowOrigins: [],
      origin,
    },
  };
};
