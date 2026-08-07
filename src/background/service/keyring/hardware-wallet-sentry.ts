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

// Ledger and OneKey cache the device info on the keyring itself. Trezor's
// keyring comes from a package, so its bridge carries the info instead — and
// the MV2 bridge only ever knows the model.
const readMetadata = (keyring: any): HardwareSigningMetadata | undefined => {
  // Runs while a signing error is being rethrown: throwing in here would
  // replace the real failure with a reporting bug.
  try {
    const model = keyring?.getModel?.();

    return (
      keyring?.getHardwareSigningMetadata?.() ??
      keyring?.bridge?.getHardwareSigningMetadata?.() ??
      (model ? { device_model: model } : undefined)
    );
  } catch {
    return undefined;
  }
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

  // Read at failure time: the device info is only known once the keyring has
  // talked to the device, which happens inside sign().
  const attach = (error: unknown) => {
    attachHardwareSigningContext(error, {
      wallet,
      operation,
      metadata: readMetadata(keyring),
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
