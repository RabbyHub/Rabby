import type { ContextActionData } from '@rabby-wallet/rabby-security-engine/dist/rules';

const DOMAIN_RE = /(?:https?:\/\/)?(?:[\p{L}\p{N}](?:[\p{L}\p{N}-]{0,61}[\p{L}\p{N}])?\.)+(?:xn--[a-z0-9-]{2,59}|[\p{L}]{2,63})(?::\d+)?(?:[/?#][^\s"'<>]*)?/giu;

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
      Array.from(message.matchAll(DOMAIN_RE))
        .map((match) => normalizeHostname(match[0]))
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
