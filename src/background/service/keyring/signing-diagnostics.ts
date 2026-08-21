import {
  attachSigningContext,
  getSigningContext,
  recordPrimitiveSigningCarrier,
} from '@/utils/sentry';
import * as Sentry from '@sentry/browser';

export type SigningOperation =
  | 'transaction'
  | 'personal_message'
  | 'typed_data'
  | 'eip7702_authorization';

export type SigningStage =
  | 'preflight'
  | 'connect'
  | 'unlock'
  | 'derive'
  | 'prepare'
  | 'sign'
  | 'finalize'
  | 'unknown';

export type SigningWalletFamily =
  | 'hardware'
  | 'software'
  | 'walletconnect'
  | 'contract'
  | 'unknown';

export type SigningTransport =
  | 'webhid'
  | 'usb'
  | 'bluetooth'
  | 'qr'
  | 'unknown';

export type SigningErrorCategory =
  | 'user_cancelled'
  | 'timeout'
  | 'disconnected'
  | 'device_locked'
  | 'unsupported'
  | 'invalid_payload'
  | 'vault_locked'
  | 'decrypt_failed'
  | 'derivation_failed'
  | 'unknown';

export type ProviderDiagnostics = {
  wallet_provider?: unknown;
  transport?: unknown;
  error_category?: unknown;
  provider_code?: unknown;
  provider_stage?: unknown;
  provider_reason?: unknown;
  provider_metadata?: unknown;
};

export type HardwareSigningMetadata = {
  device_model?: string;
  firmware_version?: string;
  app_name?: string;
  app_version?: string;
  device_mode?: string;
};

export type SigningDiagnosticsKeyring = {
  type?: unknown;
  signingDiagnosticsProvider?: unknown;
  beginSigningAttempt?: (
    operation: SigningOperation,
    signingAddress?: string,
    attempt?: SigningAttempt
  ) => unknown;
  endSigningAttempt?: (attempt: unknown, error?: unknown) => void;
  getSigningDiagnostics?: (
    error: unknown,
    attempt: SigningAttempt
  ) => ProviderDiagnostics | undefined;
  bridge?: {
    getSigningDiagnostics?: (
      error: unknown,
      attempt: SigningAttempt
    ) => ProviderDiagnostics | undefined;
  };
};

export type SigningAttempt = {
  operation: SigningOperation;
  signingAddress?: string;
  startedAt: number;
  stage: SigningStage;
  setStage: (stage: SigningStage) => void;
};

export type SigningDiagnosticsProvider = (
  keyring: SigningDiagnosticsKeyring,
  error: unknown,
  attempt: SigningAttempt
) => ProviderDiagnostics | undefined;

export type SigningContext = {
  schema_version: 1;
  wallet_family: SigningWalletFamily;
  wallet_provider: string;
  transport: SigningTransport;
  operation: SigningOperation;
  stage: SigningStage;
  outcome: 'failed';
  error_category: SigningErrorCategory;
  duration_bucket: 'lt_100ms' | '100ms_1s' | '1s_5s' | 'gte_5s';
  provider_code?: string;
  provider_stage?: string;
  provider_reason?: string;
  provider_metadata?: Record<string, string | number | boolean>;
  originalError?: unknown;
};

const signingDiagnosticsProviders = new Map<
  string,
  SigningDiagnosticsProvider
>();

const supportedProviders = new Set([
  'ledger',
  'onekey',
  'trezor',
  'bitbox02',
  'imkey',
  'gridplus',
  'keystone',
  'ngravezero',
  'walletconnect',
  'gnosis',
  'coinbase',
  'private_key',
  'mnemonic',
  'cobo_argus',
]);

export const registerSigningDiagnosticsProvider = (
  provider: string,
  adapter: SigningDiagnosticsProvider
) => {
  if (/^[a-z0-9_-]{1,32}$/i.test(provider)) {
    const normalized = provider.toLowerCase();
    supportedProviders.add(normalized);
    signingDiagnosticsProviders.set(normalized, adapter);
  }
};

const durationBucket = (
  durationMs: number
): SigningContext['duration_bucket'] => {
  if (durationMs < 100) return 'lt_100ms';
  if (durationMs < 1000) return '100ms_1s';
  if (durationMs < 5000) return '1s_5s';
  return 'gte_5s';
};

const walletFamily = (type: unknown): SigningWalletFamily => {
  if (typeof type !== 'string') return 'unknown';
  if (type.includes('Hardware')) return 'hardware';
  if (type === 'Simple Key Pair' || type === 'HD Key Tree') return 'software';
  if (type === 'WalletConnect' || type === 'Coinbase') return 'walletconnect';
  if (type === 'Gnosis' || type === 'CoboArgus') return 'contract';
  return 'unknown';
};

const normalizeProvider = (value: unknown): SigningContext['wallet_provider'] =>
  typeof value === 'string' && supportedProviders.has(value.toLowerCase())
    ? value.toLowerCase()
    : 'unknown';

const providerReference = (value: unknown) =>
  typeof value === 'string' && /^[a-z0-9_-]{1,32}$/i.test(value)
    ? value.toLowerCase()
    : undefined;

const normalizeTransport = (value: unknown): SigningTransport =>
  value === 'webhid' ||
  value === 'usb' ||
  value === 'bluetooth' ||
  value === 'qr'
    ? value
    : 'unknown';

const normalizeErrorCategory = (value: unknown): SigningErrorCategory => {
  const categories: SigningErrorCategory[] = [
    'user_cancelled',
    'timeout',
    'disconnected',
    'device_locked',
    'unsupported',
    'invalid_payload',
    'vault_locked',
    'decrypt_failed',
    'derivation_failed',
    'unknown',
  ];
  return typeof value === 'string' && categories.includes(value as any)
    ? (value as SigningErrorCategory)
    : 'unknown';
};

type NormalizedProviderDiagnostics = Partial<
  Pick<
    SigningContext,
    | 'wallet_provider'
    | 'transport'
    | 'error_category'
    | 'provider_code'
    | 'provider_stage'
    | 'provider_reason'
    | 'provider_metadata'
  >
>;

const commonMetadataKeys = [
  'device_model',
  'firmware_version',
  'app_name',
  'app_version',
  'device_mode',
];

const providerMetadataKeys: Record<string, string[]> = {
  ledger: [
    ...commonMetadataKeys,
    'status_word',
    'device_action_steps',
    'slowest_gap_bucket',
    'overlapping_attempt',
    'session_reused',
    'clear_signing_context_errors',
    'clear_signing_type',
  ],
  onekey: commonMetadataKeys,
  trezor: commonMetadataKeys,
};

const normalizeMetadata = (
  value: unknown,
  providerHint?: unknown
): NormalizedProviderDiagnostics => {
  if (!value || typeof value !== 'object') return {};
  const diagnostics = value as ProviderDiagnostics;
  const providerCode = diagnostics.provider_code;
  const providerStage = diagnostics.provider_stage;
  const providerReason = diagnostics.provider_reason;
  const providerMetadata = diagnostics.provider_metadata;
  const provider = normalizeProvider(
    diagnostics.wallet_provider ?? providerHint
  );
  const safeMetadata: Record<string, string | number | boolean> = {};
  if (providerMetadata && typeof providerMetadata === 'object') {
    for (const key of providerMetadataKeys[provider] ?? []) {
      const item = (providerMetadata as Record<string, unknown>)[key];
      if (
        (typeof item === 'string' && item.length <= 512) ||
        (typeof item === 'number' &&
          Number.isFinite(item) &&
          item >= 0 &&
          item <= 99) ||
        typeof item === 'boolean'
      ) {
        safeMetadata[key] = item;
      }
    }
  }
  return {
    wallet_provider: provider,
    transport: normalizeTransport(diagnostics.transport),
    error_category: normalizeErrorCategory(diagnostics.error_category),
    ...(typeof providerCode === 'string' &&
    /^[a-z0-9_.:-]{1,32}$/i.test(providerCode)
      ? { provider_code: providerCode }
      : {}),
    ...(typeof providerStage === 'string' &&
    /^[a-z0-9_.:-]{1,32}$/i.test(providerStage)
      ? { provider_stage: providerStage }
      : {}),
    ...(typeof providerReason === 'string' && providerReason.length <= 512
      ? { provider_reason: providerReason }
      : {}),
    ...(Object.keys(safeMetadata).length
      ? { provider_metadata: safeMetadata }
      : {}),
  };
};

const resolveProviderDiagnostics = (
  keyring: SigningDiagnosticsKeyring,
  error: unknown,
  attempt: SigningAttempt
) => {
  try {
    const direct = keyring.getSigningDiagnostics?.(error, attempt);
    if (direct) {
      return normalizeMetadata(direct, keyring.signingDiagnosticsProvider);
    }
    const bridge = keyring.bridge?.getSigningDiagnostics?.(error, attempt);
    if (bridge) {
      return normalizeMetadata(bridge, keyring.signingDiagnosticsProvider);
    }
    const provider = providerReference(keyring.signingDiagnosticsProvider);
    const adapter = provider
      ? signingDiagnosticsProviders.get(provider)
      : undefined;
    return adapter
      ? normalizeMetadata(
          adapter(keyring, error, attempt),
          keyring.signingDiagnosticsProvider
        )
      : {};
  } catch {
    return {};
  }
};

const classifySoftwareError = (error: unknown): SigningErrorCategory => {
  const value = error as any;
  return normalizeErrorCategory(value?.error_category ?? value?.category);
};

const registerSimpleProvider = (
  provider: string,
  walletTransport: SigningTransport = 'unknown',
  classify = false
) =>
  registerSigningDiagnosticsProvider(provider, (_keyring, error) => ({
    wallet_provider: provider,
    transport: walletTransport,
    error_category: classify ? classifySoftwareError(error) : 'unknown',
  }));

for (const provider of [
  ['bitbox02', 'unknown'],
  ['imkey', 'unknown'],
  ['gridplus', 'unknown'],
  ['walletconnect', 'unknown'],
  ['gnosis', 'unknown'],
  ['coinbase', 'unknown'],
] as const) {
  registerSimpleProvider(provider[0], provider[1]);
}
registerSimpleProvider('private_key', 'unknown', true);
registerSimpleProvider('mnemonic', 'unknown', true);
registerSimpleProvider('cobo_argus', 'unknown');

const cloneSharedError = (error: unknown) => {
  if (error instanceof Error) {
    const clone = new Error(error.message);
    clone.name = error.name;
    clone.stack = error.stack;
    Object.assign(clone, error);
    return clone;
  }
  if (error && typeof error === 'object') {
    return Object.assign(Object.create(Object.getPrototypeOf(error)), error);
  }
  return error;
};

const toErrorCarrier = (error: unknown) => {
  if (error && typeof error === 'object') return error;
  return Object.assign(new Error(String(error)), { cause: error });
};

export const withSigningDiagnostics = (
  keyring: SigningDiagnosticsKeyring,
  operation: SigningOperation,
  sign: (attempt: SigningAttempt) => any,
  signingAddress?: string
) => {
  const startedAt = Date.now();
  const signingAttempt = {
    operation,
    signingAddress,
    startedAt,
    stage: 'unknown' as SigningStage,
    setStage: (stage: SigningStage) => {
      signingAttempt.stage = stage;
    },
  };
  let attempt: unknown;
  try {
    attempt = keyring.beginSigningAttempt?.(
      operation,
      signingAddress,
      signingAttempt
    );
  } catch {
    attempt = undefined;
  }
  let finished = false;
  const finish = (error?: unknown) => {
    if (finished) return;
    finished = true;
    try {
      keyring.endSigningAttempt?.(attempt, error);
    } catch {
      // Diagnostics lifecycle must never affect signing behavior.
    }
  };
  const attach = (error: unknown) => {
    const preserveOriginalRejection = !error || typeof error !== 'object';
    const attemptError = getSigningContext(error)
      ? cloneSharedError(error)
      : toErrorCarrier(error);
    finish(attemptError);
    const metadata = resolveProviderDiagnostics(
      keyring,
      attemptError,
      signingAttempt
    );
    const errorCategory =
      metadata.error_category ??
      normalizeErrorCategory(
        (error as any)?.error_category ?? (error as any)?.category
      );
    attachSigningContext(attemptError, {
      schema_version: 1,
      wallet_family: walletFamily(keyring?.type),
      wallet_provider: metadata.wallet_provider ?? 'unknown',
      transport: metadata.transport ?? 'unknown',
      operation,
      stage: signingAttempt.stage,
      outcome: 'failed',
      error_category: errorCategory,
      duration_bucket: durationBucket(Date.now() - startedAt),
      ...metadata,
      originalError: (error as any)?.cause ?? error,
    });
    if (preserveOriginalRejection) {
      recordPrimitiveSigningCarrier(error, attemptError);
      Sentry.captureException(attemptError);
      throw error;
    }
    throw attemptError;
  };

  try {
    const result = sign(signingAttempt);
    return result && typeof result.then === 'function'
      ? result.then((value: unknown) => {
          finish();
          return value;
        }, attach)
      : (finish(), result);
  } catch (error) {
    return attach(error);
  }
};

registerSimpleProvider('onekey', 'usb');
registerSimpleProvider('trezor', 'usb');
