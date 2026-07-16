jest.mock('@ledgerhq/devices', () => ({
  ledgerUSBVendorId: 0x2c97,
}));

jest.mock('webextension-polyfill', () => ({}));

jest.mock('@/ui/utils', () => ({
  hasConnectedLedgerDevice: jest.fn(),
}));

import {
  isLedgerConnectionOpeningError,
  isLedgerConnectionRecoverableError,
  isLedgerDisconnectedError,
  isLedgerLockError,
} from '@/ui/utils/ledger';

describe('Ledger status message helpers', () => {
  test('detects Ledger lock status words', () => {
    expect(isLedgerLockError('Ledger: Device is locked 0x5515')).toBe(true);
    expect(isLedgerLockError('DeviceLockedError')).toBe(true);
    expect(isLedgerLockError('Ledger: Device is locked')).toBe(true);
    expect(isLedgerLockError('Ledger: Device disconnected')).toBe(false);
  });

  test('detects Ledger disconnect errors', () => {
    expect(isLedgerDisconnectedError('DISCONNECTED')).toBe(true);
    expect(isLedgerDisconnectedError('Ledger: Device disconnected')).toBe(true);
    expect(
      isLedgerDisconnectedError(
        'NotAllowedError: Failed to open the device. _tag ConnectionOpeningError'
      )
    ).toBe(false);
    expect(isLedgerDisconnectedError('Ledger: Device is locked 0x5515')).toBe(
      false
    );
  });

  test('detects WebHID opening failures as recoverable connection errors', () => {
    const message =
      'NotAllowedError: Failed to open the device. _tag ConnectionOpeningError';

    expect(isLedgerConnectionOpeningError(message)).toBe(true);
    expect(isLedgerConnectionRecoverableError(message)).toBe(true);
    expect(
      isLedgerConnectionOpeningError('NotAllowedError: Permission denied')
    ).toBe(false);
  });
});
