export type SentryIgnorePattern = string | RegExp;

export const sanitizeSentryBreadcrumbUrl = (value: string) => {
  const withoutQueryOrFragment = value.split(/[?#]/, 1)[0];

  return withoutQueryOrFragment.replace(/0x[a-f\d]{40,64}/gi, '[redacted]');
};

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
  ].filter(Boolean);

  return [
    ...parts.map(String),
    ...collectErrorText((error as any).cause, depth + 1),
  ];
};

export const shouldIgnoreSentryError = (error: unknown) => {
  const text = collectErrorText(error).join('\n') || String(error || '');

  if (
    RABBY_SENTRY_IGNORE_ERRORS.some((pattern) =>
      typeof pattern === 'string' ? text.includes(pattern) : pattern.test(text)
    )
  ) {
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
