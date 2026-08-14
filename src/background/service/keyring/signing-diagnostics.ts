import { attachSigningContext } from '@/utils/sentry';

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

export type SigningContext = {
  schema_version: 1;
  wallet_family: SigningWalletFamily;
  wallet_provider: 'unknown';
  transport: SigningTransport;
  operation: SigningOperation;
  stage: 'sign';
  outcome: 'failed';
  error_category: 'unknown';
  duration_bucket: 'lt_100ms' | '100ms_1s' | '1s_5s' | 'gte_5s';
  originalError?: unknown;
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

export const withSigningDiagnostics = (
  keyring: { type?: unknown },
  operation: SigningOperation,
  sign: () => any
) => {
  const startedAt = Date.now();
  const attach = (error: unknown) => {
    attachSigningContext(error, {
      schema_version: 1,
      wallet_family: walletFamily(keyring?.type),
      wallet_provider: 'unknown',
      transport: 'unknown',
      operation,
      stage: 'sign',
      outcome: 'failed',
      error_category: 'unknown',
      duration_bucket: durationBucket(Date.now() - startedAt),
      originalError: (error as any)?.cause ?? error,
    });
    throw error;
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
