import type { HardwareSigningContext } from '@/background/service/keyring/hardware-wallet-sentry';

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

const HARDWARE_SENTRY_IGNORE_ERRORS: SentryIgnorePattern[] = [
  /refusedbyuser|userrefusedondevice/iu,
  /failure_(?:action|pin)cancelled|method_(?:cancel|interrupted)/iu,
  /^(?:Error: )?(?:109|802|803|822):/u,
  /^(?:Error: )?[{]"code":(?:"(?:109|802|803|822)"|(?:109|802|803|822))(?:,|[}])/u,
  /\b0x6985\b/iu,
  /^(?:Error: )*(?:Action cancell?ed by user|Cancell?ed|Popup closed)$/iu,
  /not supported on this device|only version 4 of typed data signing is supported|typed data payload is incomplete/iu,
  /device is locked|device not found|no (?:\w+ ){0,2}device found|multiple \w+ devices detected/iu,
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

const hardwareSigningContexts = new WeakMap<object, HardwareSigningContext>();

export const attachHardwareSigningContext = (
  error: unknown,
  context: HardwareSigningContext
) => {
  if (error && typeof error === 'object') {
    hardwareSigningContexts.set(error, context);
  }
};

export const getHardwareSigningContext = (error: unknown) =>
  error && typeof error === 'object'
    ? hardwareSigningContexts.get(error)
    : undefined;

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

  const hardware = getHardwareSigningContext(error);
  if (hardware) {
    if (matchesAny(HARDWARE_SENTRY_IGNORE_ERRORS, candidates)) {
      return true;
    }

    // Hardware signing errors must remain reportable even when a transport
    // failure uses a generic network error message.
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
  exception?: { values?: { type?: string; value?: string }[] };
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

// The shape of an SDK error is decided by the device library, not by Rabby, so
// it is flattened to text and redacted instead of being handed to Sentry whole.
const describeOriginalError = (error: unknown) => {
  const parts = collectErrorText(error);

  try {
    const serialized = JSON.stringify(error);
    if (serialized && serialized !== '{}') {
      parts.push(serialized);
    }
  } catch {
    // Circular SDK errors: the text collected above is all we can report.
  }

  return redactSensitiveText(parts.join(' | ')) || undefined;
};

// A device status word is two bytes. Validated here as well as in the keyring
// that produces it, because this is the boundary that writes it into a
// fingerprint: metadata arrives from a duck-typed keyring, and an unbounded
// value in a fingerprint splits grouping without limit.
const DEVICE_STATUS_WORD_SHAPE = /^[\da-f]{1,4}$/u;

const readDeviceStatusWord = (metadata?: { status_word?: unknown }) => {
  const word = metadata?.status_word;

  return typeof word === 'string' && DEVICE_STATUS_WORD_SHAPE.test(word)
    ? word
    : undefined;
};

const readString = (value: unknown) =>
  typeof value === 'string' ? redactSensitiveText(value) : undefined;

const readNumber = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const readBoolean = (value: unknown) =>
  typeof value === 'boolean' ? value : undefined;

const setIfDefined = (
  target: Record<string, unknown>,
  key: string,
  value: unknown
) => {
  if (value !== undefined) {
    target[key] = value;
  }
};

// event.extra is sent verbatim. Keep this as an allowlist: keyrings are
// duck-typed and must not be able to smuggle APDUs, addresses or session IDs
// through unreviewed metadata keys.
const redactHardwareMetadata = (metadata: Record<string, unknown>) => {
  const redacted: Record<string, unknown> = {};

  for (const key of [
    'device_model',
    'firmware_version',
    'app_name',
    'app_version',
    'device_mode',
    'device_action_steps',
    'ledger_action',
    'ledger_action_status',
  ]) {
    setIfDefined(redacted, key, readString(metadata[key]));
  }
  setIfDefined(redacted, 'status_word', readDeviceStatusWord(metadata));

  for (const key of [
    'session_age_ms',
    'session_action_count',
    'ledger_action_duration_ms',
    'ledger_context_error_count',
    'ledger_context_count',
  ]) {
    setIfDefined(redacted, key, readNumber(metadata[key]));
  }

  setIfDefined(
    redacted,
    'session_reused',
    readBoolean(metadata.session_reused)
  );
  setIfDefined(
    redacted,
    'ledger_web3_checks_opt_in_result',
    readBoolean(metadata.ledger_web3_checks_opt_in_result)
  );
  setIfDefined(
    redacted,
    'ledger_clear_signing_timeout_suspected',
    readBoolean(metadata.ledger_clear_signing_timeout_suspected)
  );

  return redacted;
};

const redactHardwareException = (event: SentryEventLike) => {
  event.message = event.message
    ? redactSensitiveText(event.message)
    : undefined;
  event.exception?.values?.forEach((exception) => {
    if (exception.type) {
      exception.type = redactSensitiveText(exception.type);
    }
    if (exception.value) {
      exception.value = redactSensitiveText(exception.value);
    }
  });
};

export const applyHardwareSigningContext = (
  event: SentryEventLike,
  error: unknown
) => {
  const hardware = getHardwareSigningContext(error);
  if (!hardware) {
    return;
  }
  redactHardwareException(event);

  // Supplied by the keyring, never re-derived here: the thrown message is the
  // whole error chain flattened into one string, in which every nested code is
  // rendered in the same 0x-prefixed shape as the real status word, so no
  // position rule over that text can pick the right one. Only the keyring that
  // owns the device protocol knows which field is authoritative, and only the
  // ones that speak in status words set it at all.
  const statusWord = readDeviceStatusWord(hardware.metadata);

  event.tags = {
    ...event.tags,
    hardware_wallet: hardware.wallet,
    sign_operation: hardware.operation,
    ...(statusWord ? { device_status_word: statusWord } : undefined),
    ...(hardware.metadata?.ledger_clear_signing_timeout_suspected === true
      ? { ledger_clear_signing_timeout_suspected: 'true' }
      : undefined),
  };
  // Only extends the fingerprint when a status word was found, so failures
  // without one keep grouping exactly as they did before.
  event.fingerprint = [
    'hardware-wallet-signing',
    hardware.wallet,
    hardware.operation,
    ...(statusWord ? [statusWord] : []),
    '{{ default }}',
  ];

  event.extra = {
    ...Object.fromEntries(
      Object.entries(event.extra ?? {}).filter(
        ([key]) => key !== '__serialized__'
      )
    ),
    ...(hardware.metadata
      ? { hardware_device: redactHardwareMetadata(hardware.metadata) }
      : undefined),
    hardware_original_error: describeOriginalError(hardware.originalError),
  };
};
