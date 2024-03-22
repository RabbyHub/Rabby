import { useEffect, useState } from 'react';
import { hasConnectedImKeyDevice } from '@/ui/utils';
import browser from 'webextension-polyfill';
import { imKeyUSBVendorId } from '@/constant';

const navigator = window.navigator as any;

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
    navigator.usb.addEventListener('connect', onConnect);
    navigator.usb.addEventListener('disconnect', onDisconnect);
    browser.windows.onFocusChanged.addListener(detectDevice);

    return () => {
      navigator.usb.removeEventListener('connect', onConnect);
      navigator.usb.removeEventListener('disconnect', onDisconnect);
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
  const device = await navigator.usb.requestDevice({
    filters: imKeyDevices,
  });
  return device;
}
export async function getImKeyDevices(): Promise<any> {
  const devices = await navigator.usb.getDevices();
  return devices.filter((d) => d.vendorId === imKeyUSBVendorId);
}

export async function getImKeyFirstImKeyDevice(): Promise<any> {
  const existingDevices = await getImKeyDevices();
  if (existingDevices.length > 0) return existingDevices[0];
  return requestImKeyDevice();
}
