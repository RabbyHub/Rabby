import { KEYRING_CLASS } from '@/constant';
import {
  isLedgerConnectionRecoverableError,
  isLedgerLockError,
} from './ledger';

export const isHardwareRecoveryError = (
  type: string | undefined,
  message: string
) => {
  if (type === KEYRING_CLASS.HARDWARE.LEDGER) {
    return (
      isLedgerLockError(message) || isLedgerConnectionRecoverableError(message)
    );
  }
  if (type === KEYRING_CLASS.HARDWARE.ONEKEY) {
    return message === 'DISCONNECTED' || message.startsWith('901:');
  }
  return false;
};
