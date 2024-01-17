import { useEffect, useState } from 'react';
import { hasConnectedImKeyDevice } from '@/utils';
import browser from 'webextension-polyfill';
import { imKeyUSBVendorId } from '@/constant';

export const useImKeyDeviceConnected = () => {
  const [connected, setConnected] = useState(false);

  const onConnect = async ({ device }) => {
    if (device.vendorId === imKeyUSBVendorId) {
      setConnected(true);
    }
  };

  const onDisconnect = ({ device }) => {
    if (device.vendorId === imKeyUSBVendorId) {
      setConnected(false);
    }
  };

  const detectDevice = async () => {
    hasConnectedImKeyDevice().then((state) => {
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
