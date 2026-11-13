import {
  ONEKEY_WEBUSB_FILTER,
  isKnownTrezorWebUsbDevice,
} from '@onekeyfe/hd-shared';
import { t } from 'i18next';

function isOneKeyDevice(device: USBDevice) {
  return (
    ONEKEY_WEBUSB_FILTER.some(
      (filter) =>
        device.vendorId === filter.vendorId &&
        device.productId === filter.productId
    ) && !isKnownTrezorWebUsbDevice(device)
  );
}

async function requestOneKeyDevice(): Promise<USBDevice> {
  if (!navigator.usb) {
    throw new Error(t('background.keyring.onekey.webUSBUnavailable'));
  }
  const device = await navigator.usb.requestDevice({
    filters: ONEKEY_WEBUSB_FILTER,
  });
  if (!isOneKeyDevice(device)) {
    throw new Error(t('background.keyring.onekey.notFoundDevice'));
  }
  return device;
}

export async function getOneKeyDevices(): Promise<USBDevice[]> {
  const devices = (await navigator.usb?.getDevices()) ?? [];
  return devices.filter(isOneKeyDevice);
}

export async function getOneKeyFirstOneKeyDevice(): Promise<USBDevice> {
  const existingDevices = await getOneKeyDevices();
  if (existingDevices.length > 0) return existingDevices[0];
  return requestOneKeyDevice();
}
