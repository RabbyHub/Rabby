import { KEYRING_CLASS } from '@/constant';
import { attachHardwareSigningContext } from '@/utils/sentry';

export type SignOperation =
  | 'transaction'
  | 'message'
  | 'personal_message'
  | 'typed_data'
  | 'eip7702_authorization';

export type HardwareSigningMetadata = {
  device_model?: string;
  firmware_version?: string;
  app_name?: string;
  app_version?: string;
};

export type HardwareSigningContext = {
  wallet: string;
  operation: string;
  metadata?: HardwareSigningMetadata;
  originalError?: unknown;
};

const HARDWARE_WALLETS: Record<string, string> = {
  [KEYRING_CLASS.HARDWARE.LEDGER]: 'ledger',
  [KEYRING_CLASS.HARDWARE.ONEKEY]: 'onekey',
  [KEYRING_CLASS.HARDWARE.TREZOR]: 'trezor',
};

export const withHardwareSigningContext = (
  keyring: any,
  operation: SignOperation,
  sign: () => any
) => {
  const wallet = HARDWARE_WALLETS[keyring?.type];
  if (!wallet) {
    return sign();
  }

  const metadata = keyring?.getHardwareSigningMetadata?.();

  const attach = (error: unknown) => {
    attachHardwareSigningContext(error, {
      wallet,
      operation,
      metadata,
      originalError: (error as any)?.cause ?? error,
    });
    throw error;
  };

  try {
    return Promise.resolve(sign()).catch(attach);
  } catch (error) {
    return attach(error);
  }
};
