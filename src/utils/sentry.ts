import type { SigningContext } from '@/background/service/keyring/signing-diagnostics';

export type SentryIgnorePattern = string | RegExp;

export const sanitizeSentryBreadcrumbUrl = (value: string) => {
  const withoutQueryOrFragment = value.split(/[?#]/, 1)[0];

  return withoutQueryOrFragment.replace(/0x[a-f\d]{40,64}/gi, '[redacted]');
};

// Applied in beforeSend only, never as the SDK's own `ignoreErrors`: the SDK
// filter runs before beforeSend, so it would drop hardware signing failures
// before the bypass below can keep them. shouldIgnoreSentryError takes the
// Sentry-generated event text so patterns matching that still work.
export const RABBY_SENTRY_IGNORE_ERRORS: SentryIgnorePattern[] = [
  'ResizeObserver loop limit exceeded',
  'ResizeObserver loop completed with undelivered notifications',
  'Network Error',
  'Request limit exceeded.',
  'Failed to fetch',
  /^(Error(?:\[[^\]]+\])?: )?Request failed with status code [1-5]\d{2}$/,
  /(^|\n)Request timeout($|\n)/i,
  /The request took too long to respond\.[\s\S]*Details: The request timed out\./,
  'TransportOpenUserCancelled',
  'Transport error: {"event":"transport_error","params":["Websocket connection failed"]}',
  'Non-Error promise rejection captured with keys: code, message',
  'Non-Error promise rejection captured with keys: message, stack',
  'Non-Error promise rejection captured with keys: message',
  /Non-Error promise rejection captured/,
  /\[From .*\]/, // error from custom rpc
  /AxiosError/,
  /WebSocket connection failed/,
  /Could not establish connection/,
  /Receiving end does not exist/,
  /HttpRequestError/,
  /http/i,
  /not supported on this device|only version 4 of typed data signing is supported|typed data payload is incomplete/iu,

  // Browser extension lifecycle and runtime shutdown noise.
  /A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received/,
  /\bsw is (dead|inactive)\b/i,
  /\bNo SW\b/,
  /The browser is shutting down/,
  /The page keeping the extension port is moved into back\/forward cache, so the message channel is closed/,

  // Browser window/popup state can disappear while the extension is being opened.
  /Could not find an active browser window/,
  /No (last-focused|current) window/,
  /No window with id: \d+\.?/,
  /Failed to open popup/,

  // Chrome storage quota/disk errors are environmental and not actionable in Rabby.
  /IO error: .*FILE_ERROR_NO_SPACE.*ChromeMethodBFE/,
  /IO error: .*FILE_ERROR_FAILED.*ChromeMethodBFE: \d+::WritableFileSync::\d+/,
  /Unable to create writable file.*ChromeMethodBFE/,
  /Internal error opening backing store for indexedDB\.open\./,
  /Encountered full disk while opening backing store for indexedDB\.open\./,

  // Browser API denials caused by unfocused documents or revoked transient permission.
  /^(Error: )?NotAllowedError: Permission denied\.$/,
  /NotAllowedError: Failed to execute 'writeText' on 'Clipboard': Document is not focused\./,
  /DataCloneError: Function object could not be cloned/,
  /UnknownError: Internal error\./,
  /^(TypeError: )?Load failed$/,

  // External RPC receipt polling failures from public/testnet endpoints.
  /RPC Request failed\. URL: .* Request body: \{"method":"eth_getTransactionReceipt"/,
  /The request took too long to respond\. URL: .* Request body: \{"method":"eth_getTransactionReceipt"/,
  /Request exceeds defined limit\. URL: .* Request body: \{"method":"eth_getTransactionReceipt"/,
];

// Stale background service worker noise: after an extension update the old
// background may keep running pre-guard code that throws "undefined.apply"
// inside a listen callback. Message.onRequest catches it and forwards a
// serialized {message, stack} to the calling page, where it surfaces as an
// unparseable unhandled rejection tagged with the new release. The message
// alone ("...reading 'apply'") is too generic to blanket-ignore, so match on
// the forwarded stack signature instead. Genuine background-origin reports
// are real Error instances (see setMessageErrorReporter), so callers must
// restrict this to non-Error rejections to avoid swallowing them.
const STALE_BACKGROUND_FORWARDED_STACK = /\.(?:listenCallback|onRequest) \([^)]*background\.js:\d+:\d+\)/;

const collectErrorText = (error: unknown, depth = 0): string[] => {
  if (!error || depth > 3) {
    return [];
  }

  if (typeof error !== 'object') {
    return [String(error)];
  }

  const parts = [
    (error as any).name,
    (error as any).message,
    (error as any).shortMessage,
    (error as any).details,
    // Hardware SDKs often reject with a bare code (803, 0x6985) and no message.
    (error as any).code,
  ].filter(Boolean);

  return [
    ...parts.map(String),
    ...collectErrorText((error as any).cause, depth + 1),
  ];
};

const signingContexts = new WeakMap<object, SigningContext>();
const primitiveSigningCarriers = new Map<unknown, object[]>();
const reportedSigningCarriers = new WeakSet<object>();
const signingCarriersByError = new WeakMap<object, object>();

export const recordPrimitiveSigningCarrier = (
  error: unknown,
  carrier: object
) => {
  const carriers = primitiveSigningCarriers.get(error) ?? [];
  carriers.push(carrier);
  primitiveSigningCarriers.set(error, carriers);
  reportedSigningCarriers.add(carrier);
};

export const bindSigningCarrier = (error: object, carrier: object) => {
  signingCarriersByError.set(error, carrier);
};

export const takeSigningCarrier = (error: unknown) => {
  if (error && typeof error === 'object') {
    const carrier = signingCarriersByError.get(error);
    if (carrier) signingCarriersByError.delete(error);
    return carrier;
  }
  const carriers = primitiveSigningCarriers.get(error);
  if (!carriers?.length) return undefined;
  const carrier = carriers.shift();
  if (!carriers.length) primitiveSigningCarriers.delete(error);
  return carrier;
};

export const isSigningCarrierReported = (carrier: object) =>
  reportedSigningCarriers.has(carrier);

export const attachSigningContext = (
  error: unknown,
  context: SigningContext
) => {
  if (error && typeof error === 'object') signingContexts.set(error, context);
};

export const getSigningContext = (error: unknown) =>
  error && typeof error === 'object' ? signingContexts.get(error) : undefined;

const REDACTIONS: [RegExp, string][] = [
  [/([a-z][a-z\d+.-]*:\/\/[^\s?#]+)[?#][^\s]*/giu, '$1'],
  [
    /(["']?)(address|connect[_\s-]?id|device[_\s-]?id|passphrase(?:[_\s-]?state)?|public[_\s-]?key|serial(?:[_\s-]?(?:number|no))?|session[_\s-]?id|signature|uuid)\1\s*[:=]\s*(?:"[^"]*"|'[^']*'|[^\s,;}\]]+)/giu,
    '$1$2$1: [redacted]',
  ],
  [
    /\b[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}\b/giu,
    '[redacted-uuid]',
  ],
  [/\b0x[a-f\d]{40,}\b/giu, '[redacted-hex]'],
  [/\b[a-f\d]{40,}\b/giu, '[redacted-hex]'],
  [/\b[A-Za-z\d+/]{80,}={0,2}/gu, '[redacted-data]'],
  [/\bm(?:\/\d+'?){2,}\b/gu, '[redacted-hd-path]'],
  [/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/gu, '[redacted-email]'],
];

const MAX_ERROR_TEXT_LENGTH = 4000;

export const redactSensitiveText = (value: unknown) =>
  REDACTIONS.reduce(
    (text, [pattern, replacement]) => text.replace(pattern, replacement),
    String(value ?? '')
  ).slice(0, MAX_ERROR_TEXT_LENGTH);

const matchesAny = (patterns: SentryIgnorePattern[], candidates: string[]) =>
  patterns.some((pattern) =>
    candidates.some((candidate) =>
      typeof pattern === 'string'
        ? candidate.includes(pattern)
        : pattern.test(candidate)
    )
  );

export const shouldIgnoreSentryError = (
  error: unknown,
  // Text Sentry generated for the event ("Non-Error promise rejection captured
  // with keys: ..."), which never appears on the thrown value itself.
  eventText: string[] = []
) => {
  const parts = collectErrorText(error);
  const text = parts.join('\n') || String(error || '');
  const candidates = [
    text,
    ...parts,
    error instanceof Error ? `${error.name}: ${error.message}` : '',
    ...eventText,
  ].filter(Boolean);

  const signing = getSigningContext(error);
  if (signing) {
    if (signing.error_category === 'user_cancelled') {
      return true;
    }
    // All other signing failures remain reportable, regardless of legacy text
    // filters such as Network Error or device-locked messages.
    return false;
  }

  if (matchesAny(RABBY_SENTRY_IGNORE_ERRORS, candidates)) {
    return true;
  }

  // Drop the UI-side forwarded copy of errors thrown by an old background's
  // listen callback (see STALE_BACKGROUND_FORWARDED_STACK). Restricted to
  // non-Error rejections so real background-origin reports are kept.
  if (
    error !== null &&
    typeof error === 'object' &&
    !(error instanceof Error) &&
    typeof (error as { stack?: unknown }).stack === 'string' &&
    STALE_BACKGROUND_FORWARDED_STACK.test((error as { stack: string }).stack)
  ) {
    return true;
  }

  return false;
};

type SentryEventLike = {
  message?: string;
  tags?: Record<string, unknown>;
  fingerprint?: string[];
  extra?: Record<string, unknown>;
  exception?: {
    values?: { type?: string; value?: string; stacktrace?: unknown }[];
  };
};

// Mirrors the SDK's own _getPossibleEventMessages: patterns like
// /UnknownError: Internal error\./ are written against the joined form, which
// exists nowhere else once an exception is split into type and value.
export const collectSentryEventText = (event: SentryEventLike) =>
  [
    event.message,
    ...(event.exception?.values ?? []).flatMap(({ type, value }) => [
      value,
      type && value ? `${type}: ${value}` : undefined,
    ]),
  ].filter((value): value is string => Boolean(value));

export const applySigningContext = (event: SentryEventLike, error: unknown) => {
  const context = getSigningContext(error);
  if (!context) return;

  event.tags = {
    ...event.tags,
    schema_version: context.schema_version,
    wallet_family: context.wallet_family,
    wallet_provider: context.wallet_provider,
    transport: context.transport,
    sign_operation: context.operation,
    sign_stage: context.stage,
    sign_outcome: context.outcome,
    error_category: context.error_category,
    duration_bucket: context.duration_bucket,
  };
  event.fingerprint = [
    'signing',
    context.wallet_family,
    context.wallet_provider,
    context.operation,
    context.error_category,
    '{{ default }}',
  ];
  event.message = `${context.wallet_provider} signing failed`;
  const originalException = event.exception?.values?.[0];
  event.exception = {
    values: [
      {
        ...originalException,
        type: 'SigningError',
        value: context.error_category,
      },
    ],
  };
  event.extra = {
    ...(context.provider_code
      ? { signing_provider_code: context.provider_code }
      : {}),
    ...(context.provider_stage
      ? { signing_provider_stage: context.provider_stage }
      : {}),
    ...(context.provider_reason
      ? { signing_provider_reason: context.provider_reason }
      : {}),
    ...(context.provider_metadata
      ? { signing_provider_metadata: context.provider_metadata }
      : {}),
  };
};
