import { ledgerUSBVendorId } from '@ledgerhq/devices';
import { useEffect, useState } from 'react';
import { hasConnectedLedgerDevice } from 'utils';
import { browser } from 'webextension-polyfill-ts';

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
    navigator.hid.addEventListener('connect', onConnect);
    navigator.hid.addEventListener('disconnect', onDisconnect);
    browser.windows.onFocusChanged.addListener(detectDevice);

    return () => {
      navigator.hid.removeEventListener('connect', onConnect);
      navigator.hid.removeEventListener('disconnect', onDisconnect);
      browser.windows.onFocusChanged.removeListener(detectDevice);
    };
  }, []);

  return connected;
};
