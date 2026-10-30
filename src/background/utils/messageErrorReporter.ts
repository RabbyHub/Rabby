import * as Sentry from '@sentry/browser';
import { KEYRING_TYPE } from '@/constant';
import {
  getSigningContext,
  isSigningCarrierReported,
  shouldIgnoreSentryError,
  takeSigningCarrier,
} from '@/utils/sentry';

// Wallet controller methods whose arguments or results are a private key,
// mnemonic, SLIP-39 share, passphrase, keystore or password. Engine error text
// can quote the value it choked on (`Cannot create property 'x' on string
// '…'`), and the first line of the stack repeats the message, so their errors
// never leave with the original text. The pattern also covers methods added
// later; the set lists the ones whose name doesn't say so.
const SECRET_METHOD_PATTERN = /private_?key|mnemonic|seed|passphrase|keystore|json|password|slip39/iu;
const SECRET_METHODS = new Set([
  'boot',
  'unlock',
  'setWhitelist',
  'addWhitelist',
  'toggleWhitelist',
  'setBiometricUnlock',
]);
// requestKeyring calls straight into a keyring; the software ones hold the
// mnemonic or key.
const SECRET_KEYRING_TYPES: unknown[] = [
  KEYRING_TYPE.HdKeyring,
  KEYRING_TYPE.SimpleKeyring,
];

// V8 frames start with "at", Firefox's read fn@url:line:col. Every other line
// of a stack is the message.
const STACK_FRAME_PATTERN = /^\s+at |@\S*:\d+:\d+$/u;

const getSecretMethod = (request: unknown) => {
  const { method, params } = (request ?? {}) as {
    method?: unknown;
    params?: unknown;
  };
  if (typeof method !== 'string') return undefined;
  if (SECRET_METHOD_PATTERN.test(method) || SECRET_METHODS.has(method)) {
    return method;
  }
  if (
    method === 'requestKeyring' &&
    Array.isArray(params) &&
    SECRET_KEYRING_TYPES.includes(params[0])
  ) {
    return method;
  }
  return undefined;
};

const isProgrammingError = (error: unknown): error is Error =>
  (error instanceof TypeError ||
    error instanceof ReferenceError ||
    error instanceof RangeError) &&
  (error as { code?: unknown }).code === undefined;

// Same type and stack frames, so the issue still points at the bug.
const withholdMessage = (error: Error, method: string) => {
  const withheld = new Error(`message withheld (wallet.${method})`);
  withheld.name = error.name;
  withheld.stack = [
    `${withheld.name}: ${withheld.message}`,
    ...(error.stack ?? '')
      .split('\n')
      .filter((line) => STACK_FRAME_PATTERN.test(line)),
  ].join('\n');
  return withheld;
};

// Errors thrown by pm.listen callbacks are caught in Message.onRequest and
// forwarded to the calling page as the response, so they never reach this
// context's global handlers. Business failures (user rejections, RPC errors)
// carry an rpc error code and must stay report-free; only programming errors
// are captured here.
//
// The allowlist is deliberately restricted to native engine error subtypes
// (TypeError/ReferenceError/RangeError) rather than any uncoded Error. The
// background throws hundreds of plain `new Error(...)` intentionally — mostly
// i18n business validations like "no current account" / "invalid chain id" —
// which have no rpc code either, so broadening to all uncoded Error instances
// would flood Sentry with those expected states. The engine practically never
// raises these subtypes for business logic, so they are a clean bug signal.
export const reportMessageError = (error: unknown, request: unknown) => {
  const secretMethod = getSecretMethod(request);
  if (secretMethod) {
    // The ignore list is checked here, against the real text; Sentry only
    // ever sees the withheld one.
    if (isProgrammingError(error) && !shouldIgnoreSentryError(error)) {
      Sentry.captureException(withholdMessage(error, secretMethod));
    }
    // Claimed either way: the page's copy carries the original message.
    return true;
  }

  const signingCarrier = takeSigningCarrier(error);
  if (signingCarrier) {
    if (!isSigningCarrierReported(signingCarrier)) {
      Sentry.captureException(signingCarrier);
    }
    return true;
  }

  // rpcFlow normally captures signing failures first. Capturing the same Error
  // here is deduplicated by Sentry and also covers direct wallet-controller calls.
  if (getSigningContext(error)) {
    Sentry.captureException(error);
    return true;
  }

  if (isProgrammingError(error)) {
    Sentry.captureException(error);
    return true;
  }
  return false;
};
