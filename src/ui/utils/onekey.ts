import {
  HardwareErrorCode,
  ONEKEY_WEBUSB_FILTER,
  isKnownTrezorWebUsbDevice,
} from '@onekeyfe/hd-shared';
import { t } from 'i18next';

const ONEKEY_DISCONNECT_ERROR_CODES = new Set<number>([
  HardwareErrorCode.DeviceNotFound,
  HardwareErrorCode.DeviceInterruptedFromOutside,
  HardwareErrorCode.DeviceInterruptedFromUser,
  HardwareErrorCode.WebDeviceNotFoundOrNeedsPermission,
]);

const ONEKEY_DISCONNECT_CODE_PREFIX_RE = /^(105|901|107|109):/;

export function isOneKeyDisconnectError(error: unknown): boolean {
  if (!error) return false;
  if (typeof error === 'string') {
    return (
      error === 'DISCONNECTED' ||
      error === 'No OneKey Device found' ||
      ONEKEY_DISCONNECT_CODE_PREFIX_RE.test(error)
    );
  }
  if (typeof error === 'object') {
    const record = error as {
      code?: unknown;
      errorCode?: unknown;
      message?: unknown;
      name?: unknown;
    };
    const rawCode = record.code ?? record.errorCode;
    if (
      (typeof rawCode === 'number' ||
        (typeof rawCode === 'string' && rawCode.trim() !== '')) &&
      ONEKEY_DISCONNECT_ERROR_CODES.has(Number(rawCode))
    ) {
      return true;
    }
    if (
      typeof record.message === 'string' &&
      isOneKeyDisconnectError(record.message)
    ) {
      return true;
    }
    if (
      typeof record.name === 'string' &&
      isOneKeyDisconnectError(record.name)
    ) {
      return true;
    }
  }
  return false;
}

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
