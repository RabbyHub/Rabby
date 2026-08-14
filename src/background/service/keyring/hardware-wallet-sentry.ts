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
  // Ledger runs a per-chain app; the others are single-app devices.
  app_name?: string;
  app_version?: string;
  // bootloader / notInitialized explains a whole class of signing failures.
  device_mode?: string;
  // Devices that answer in APDU status words (Ledger) report the one this
  // failure carried, read off the error by the keyring rather than scraped
  // from message text. Absent for devices that do not speak in status words.
  status_word?: string;
  // Ledger only, all diagnostics for status words the message alone cannot
  // explain (0x6a80 above all). The step trace names the stage the failure
  // reached — Clear Signing context build, context upload, or the signature
  // itself.
  //
  // The session fields are read at two different moments and must not be
  // read as one reading: session_reused is snapshotted when the attempt
  // began, session_age_ms and session_action_count describe the session that
  // is open when the failure is reported. A recovery inside the attempt
  // reconnects, so a report can legitimately pair session_reused: true with a
  // small age — those are two different sessions, and the sessionClosed entry
  // in the step trace carries the reading of the one that failed.
  device_action_steps?: string;
  session_age_ms?: number;
  session_action_count?: number;
  session_reused?: boolean;
  ledger_action?:
    | 'getAddress'
    | 'openApp'
    | 'signTx'
    | 'signMessage'
    | 'signTypedData';
  ledger_action_status?: 'completed' | 'error' | 'stopped' | 'unknown';
  ledger_action_duration_ms?: number;
  // Clear Signing descriptors that came back as errors, and how many were
  // returned at all. Absent when the transaction never took the Clear Signing
  // path, so "no Clear Signing" stays distinct from "Clear Signing, no errors".
  ledger_context_error_count?: number;
  ledger_context_count?: number;
  ledger_web3_checks_opt_in_result?: boolean;
  ledger_clear_signing_timeout_suspected?: boolean;
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
// The failure is passed in because a device status word can only be read off
// the error, and only the keyring that owns the device protocol knows which of
// its fields is the authoritative one. Keyrings that take no argument ignore it.
const readMetadata = (
  keyring: any,
  error: unknown
): HardwareSigningMetadata | undefined => {
  // Runs while a signing error is being rethrown: throwing in here would
  // replace the real failure with a reporting bug.
  try {
    const model = keyring?.getModel?.();

    return (
      keyring?.getHardwareSigningMetadata?.(error) ??
      keyring?.bridge?.getHardwareSigningMetadata?.(error) ??
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
      metadata: readMetadata(keyring, error),
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
