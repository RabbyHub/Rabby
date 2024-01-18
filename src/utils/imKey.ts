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

const imKeyDevices = [
  {
    vendorId: imKeyUSBVendorId,
  },
];

async function requestImKeyDevice(): Promise<any> {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  const device = await navigator.usb.requestDevice({
    filters: imKeyDevices,
  });
  return device;
}
export async function getImKeyDevices(): Promise<any> {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  const devices = await navigator.usb.getDevices();
  return devices.filter((d) => d.vendorId === imKeyUSBVendorId);
}

export async function getImKeyFirstImKeyDevice(): Promise<any> {
  const existingDevices = await getImKeyDevices();
  if (existingDevices.length > 0) return existingDevices[0];
  return requestImKeyDevice();
}
