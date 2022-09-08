import { ledgerUSBVendorId } from '@ledgerhq/devices';
import { useEffect, useState } from 'react';
import { hasConnectedLedgerDevice } from 'utils';

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

  useEffect(() => {
    hasConnectedLedgerDevice().then((state) => {
      setConnected(state);
    });

    navigator.hid.addEventListener('connect', onConnect);
    navigator.hid.addEventListener('disconnect', onDisconnect);

    return () => {
      navigator.hid.removeEventListener('connect', onConnect);
      navigator.hid.removeEventListener('disconnect', onDisconnect);
    };
  }, []);

  return connected;
};
