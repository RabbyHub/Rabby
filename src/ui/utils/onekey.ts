import { ONEKEY_WEBUSB_FILTER } from '@onekeyfe/hd-shared';

async function requestOneKeyDevice(): Promise<any> {
  const device = await navigator.usb?.requestDevice({
    filters: ONEKEY_WEBUSB_FILTER,
  });
  return device;
}

export async function getOneKeyDevices(): Promise<any> {
  const devices = await navigator.usb?.getDevices();
  const vendorIds = ONEKEY_WEBUSB_FILTER.reduce((acc, filter) => {
    acc.add(filter.vendorId);
    return acc;
  }, new Set<number>());
  return devices.filter((d) => vendorIds.has(d.vendorId));
}

export async function getOneKeyFirstOneKeyDevice(): Promise<any> {
  const existingDevices = await getOneKeyDevices();
  if (existingDevices.length > 0) return existingDevices[0];
  return requestOneKeyDevice();
}
