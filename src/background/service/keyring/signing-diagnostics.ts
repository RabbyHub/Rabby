import { attachSigningContext, getSigningContext } from '@/utils/sentry';

export type SigningOperation =
  | 'transaction'
  | 'personal_message'
  | 'typed_data'
  | 'eip7702_authorization';

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
};

export type SigningDiagnosticsKeyring = {
  type?: unknown;
  signingDiagnosticsProvider?: unknown;
  getSigningDiagnostics?: (error: unknown) => ProviderDiagnostics | undefined;
  bridge?: {
    getSigningDiagnostics?: (error: unknown) => ProviderDiagnostics | undefined;
  };
};

export type SigningDiagnosticsProvider = (
  keyring: SigningDiagnosticsKeyring,
  error: unknown
) => ProviderDiagnostics | undefined;

export type SigningContext = {
  schema_version: 1;
  wallet_family: SigningWalletFamily;
  wallet_provider: string;
  transport: SigningTransport;
  operation: SigningOperation;
  stage: 'sign';
  outcome: 'failed';
  error_category: SigningErrorCategory;
  duration_bucket: 'lt_100ms' | '100ms_1s' | '1s_5s' | 'gte_5s';
  provider_code?: string;
  provider_stage?: string;
  originalError?: unknown;
};

const signingDiagnosticsProviders = new Map<
  string,
  SigningDiagnosticsProvider
>();

export const registerSigningDiagnosticsProvider = (
  provider: string,
  adapter: SigningDiagnosticsProvider
) => {
  if (/^[a-z0-9_-]{1,32}$/i.test(provider)) {
    signingDiagnosticsProviders.set(provider.toLowerCase(), adapter);
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
  typeof value === 'string' && /^[a-z0-9_-]{1,32}$/i.test(value)
    ? value.toLowerCase()
    : 'unknown';

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
  >
>;

const normalizeMetadata = (value: unknown): NormalizedProviderDiagnostics => {
  if (!value || typeof value !== 'object') return {};
  const diagnostics = value as ProviderDiagnostics;
  const providerCode = diagnostics.provider_code;
  const providerStage = diagnostics.provider_stage;
  return {
    wallet_provider: normalizeProvider(diagnostics.wallet_provider),
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
  };
};

const resolveProviderDiagnostics = (
  keyring: SigningDiagnosticsKeyring,
  error: unknown
) => {
  try {
    const direct = keyring.getSigningDiagnostics?.(error);
    if (direct) return normalizeMetadata(direct);
    const bridge = keyring.bridge?.getSigningDiagnostics?.(error);
    if (bridge) return normalizeMetadata(bridge);
    const provider = normalizeProvider(keyring.signingDiagnosticsProvider);
    const adapter = signingDiagnosticsProviders.get(provider);
    return adapter ? normalizeMetadata(adapter(keyring, error)) : {};
  } catch {
    return {};
  }
};

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

export const withSigningDiagnostics = (
  keyring: SigningDiagnosticsKeyring,
  operation: SigningOperation,
  sign: () => any
) => {
  const startedAt = Date.now();
  const attach = (error: unknown) => {
    const metadata = resolveProviderDiagnostics(keyring, error);
    const attemptError = getSigningContext(error)
      ? cloneSharedError(error)
      : error;
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
      stage: 'sign',
      outcome: 'failed',
      error_category: errorCategory,
      duration_bucket: durationBucket(Date.now() - startedAt),
      ...metadata,
      originalError: (error as any)?.cause ?? error,
    });
    throw attemptError;
  };

  try {
    const result = sign();
    return result && typeof result.then === 'function'
      ? result.catch(attach)
      : result;
  } catch (error) {
    return attach(error);
  }
};
