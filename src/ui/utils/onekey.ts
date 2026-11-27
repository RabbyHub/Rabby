import {
  HardwareErrorCode,
  isKnownTrezorWebUsbDevice,
  ONEKEY_WEBUSB_FILTER,
} from '@onekeyfe/hd-shared';
import { t } from 'i18next';

const disconnectCodes = new Set<number>([
  HardwareErrorCode.DeviceNotFound,
  HardwareErrorCode.WebDeviceNotFoundOrNeedsPermission,
  HardwareErrorCode.DeviceInterruptedFromOutside,
  HardwareErrorCode.DeviceInterruptedFromUser,
]);

export function isOneKeyDisconnectError(error: unknown): boolean {
  const matchesMessage = (value: unknown) => {
    if (typeof value !== 'string') return false;
    if (value === 'DISCONNECTED' || value === 'No OneKey Device found') {
      return true;
    }
    const code = /^(\d+):/.exec(value);
    return !!code && disconnectCodes.has(Number(code[1]));
  };
  if (!error || typeof error !== 'object') return matchesMessage(error);
  const { code, errorCode, message, name } = error as {
    code?: number | string;
    errorCode?: number | string;
    message?: string;
    name?: string;
  };
  return (
    disconnectCodes.has(Number(code ?? errorCode)) ||
    matchesMessage(message) ||
    matchesMessage(name)
  );
}

function isOneKeyDevice(device: USBDevice) {
  return (
    ONEKEY_WEBUSB_FILTER.some(
      ({ vendorId, productId }) =>
        vendorId === device.vendorId && productId === device.productId
    ) && !isKnownTrezorWebUsbDevice(device)
  );
}

export async function getOneKeyDevices(): Promise<USBDevice[]> {
  if (!navigator.usb) return [];
  return (await navigator.usb.getDevices()).filter(isOneKeyDevice);
}

export async function getOneKeyFirstOneKeyDevice(): Promise<USBDevice> {
  if (!navigator.usb) {
    throw new Error(t('background.keyring.onekey.webUSBUnavailable'));
  }
  const [authorized] = await getOneKeyDevices();
  if (authorized) return authorized;

  const selected = await navigator.usb.requestDevice({
    filters: ONEKEY_WEBUSB_FILTER,
  });
  if (!isOneKeyDevice(selected)) {
    throw new Error(t('background.keyring.onekey.notFoundDevice'));
  }
  return selected;
}
