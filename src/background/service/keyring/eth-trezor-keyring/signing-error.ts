import type { SigningErrorCategory } from '../signing-diagnostics';

// Codes from @trezor/connect (constants/errors) and the device Failure_* types.
const CATEGORY_BY_CODE: Record<string, SigningErrorCategory> = {
  Failure_ActionCancelled: 'user_cancelled',
  Failure_PinCancelled: 'user_cancelled',
  Method_Cancel: 'user_cancelled',
  Method_Interrupted: 'user_cancelled',
  Method_PermissionsNotGranted: 'user_cancelled',
  Device_Disconnected: 'disconnected',
  Device_NotFound: 'disconnected',
  Device_UsedElsewhere: 'disconnected',
  Transport_Missing: 'disconnected',
  Popup_ConnectionMissing: 'disconnected',
  Failure_PinInvalid: 'device_locked',
  Failure_PinExpected: 'device_locked',
  Init_IframeTimeout: 'timeout',
  Failure_DataError: 'invalid_payload',
  Method_InvalidParameter: 'invalid_payload',
  Method_Unsupported: 'unsupported',
  Device_MissingCapability: 'unsupported',
  Device_InvalidState: 'derivation_failed',
};

// A failure that arrives without its code (e.g. thrown before the keyring
// wraps it) is matched on Connect's fixed wording for that code.
const CODE_BY_MESSAGE: [RegExp, string][] = [
  [/Action cancelled by user/, 'Failure_ActionCancelled'],
  [/Permissions not granted/, 'Method_PermissionsNotGranted'],
  [/Popup closed/, 'Method_Interrupted'],
  // Too common a word to match inside other messages; the keyring may
  // prefix it with "Error: ".
  [/^(Error: )?Canceled$/, 'Method_Cancel'],
  // Device firmware wording: "PIN entry cancelled" (core), "PIN cancelled"
  // (legacy).
  [/PIN (entry )?cancelled/, 'Failure_PinCancelled'],
  [/Device disconnected/, 'Device_Disconnected'],
  [/Device not found/, 'Device_NotFound'],
  [/Transport is missing/, 'Transport_Missing'],
];

const codeFromMessage = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return CODE_BY_MESSAGE.find(([pattern]) => pattern.test(message))?.[1];
};

export const getTrezorSigningDiagnostics = (
  error: unknown,
  failureCode?: string
) => {
  // The patched keyring keeps Connect's code on the thrown error.
  const errorCode = (error as { code?: unknown } | undefined)?.code;
  failureCode =
    failureCode ?? (typeof errorCode === 'string' ? errorCode : undefined);
  const code =
    failureCode && failureCode in CATEGORY_BY_CODE
      ? failureCode
      : codeFromMessage(error) ?? failureCode;
  return {
    wallet_provider: 'trezor' as const,
    // Suite owns the transport; Connect 10 no longer reports USB/WebUSB.
    transport: 'unknown' as const,
    error_category: (code && CATEGORY_BY_CODE[code]) || 'unknown',
    // Only the code goes to Sentry: Connect messages can echo request params.
    ...(code ? { provider_code: code } : {}),
  };
};
