import { ledgerUSBVendorId } from '@ledgerhq/devices';
import { useEffect, useState } from 'react';
import browser from 'webextension-polyfill';
import { hasConnectedLedgerDevice } from '@/ui/utils';

export enum LedgerHDPathType {
  LedgerLive = 'LedgerLive',
  Legacy = 'Legacy',
  BIP44 = 'BIP44',
}

export const LedgerHDPathTypeLabel = {
  [LedgerHDPathType.LedgerLive]: 'Ledger Live',
  [LedgerHDPathType.BIP44]: 'BIP44',
  [LedgerHDPathType.Legacy]: 'Ledger Legacy',
};

export const useLedgerDeviceConnected = () => {
  const [connected, setConnected] = useState(false);

  const onConnect = async ({ device }) => {
    if (device.vendorId === ledgerUSBVendorId) {
      setConnected(true);
    }
  };

  const onDisconnect = ({ device }) => {
    if (device.vendorId === ledgerUSBVendorId) {
      setConnected(false);
    }
  };

  const detectDevice = async () => {
    hasConnectedLedgerDevice().then((state) => {
      setConnected(state);
    });
  };

  useEffect(() => {
    detectDevice();
    navigator.hid?.addEventListener('connect', onConnect);
    navigator.hid?.addEventListener('disconnect', onDisconnect);
    browser.windows.onFocusChanged.addListener(detectDevice);

    return () => {
      navigator.hid?.removeEventListener('connect', onConnect);
      navigator.hid?.removeEventListener('disconnect', onDisconnect);
      browser.windows.onFocusChanged.removeListener(detectDevice);
    };
  }, []);

  return connected;
};

const LEDGER_LOCK_ERROR_CODES = ['0x5515', '0x6b0c', '0x650f'];
const LEDGER_LOCK_ERROR_MARKERS = ['devicelockederror', 'device is locked'];
const LEDGER_DISCONNECTED_ERROR_MARKERS = [
  'device disconnected',
  'no connected ledger device found',
  'devicedisconnectedwhilesendingerror',
  'disconnecteddeviceduringoperation',
  'devicedisconnectedbeforesendingapdu',
];
const LEDGER_CONNECTION_OPENING_ERROR_MARKERS = [
  'failed to open the device',
  'connectionopeningerror',
];

export const isLedgerLockError = (message = '') =>
  LEDGER_LOCK_ERROR_CODES.some((code) => message.includes(code)) ||
  LEDGER_LOCK_ERROR_MARKERS.some((marker) =>
    message.toLowerCase().includes(marker)
  );

export const isLedgerDisconnectedError = (message = '') =>
  message === 'DISCONNECTED' ||
  LEDGER_DISCONNECTED_ERROR_MARKERS.some((marker) =>
    message.toLowerCase().includes(marker)
  );

export const isLedgerConnectionOpeningError = (message = '') =>
  LEDGER_CONNECTION_OPENING_ERROR_MARKERS.some((marker) =>
    message.toLowerCase().includes(marker)
  );

export const isLedgerConnectionRecoverableError = (message = '') =>
  isLedgerDisconnectedError(message) || isLedgerConnectionOpeningError(message);
