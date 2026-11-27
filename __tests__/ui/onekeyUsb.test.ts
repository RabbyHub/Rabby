import { HardwareErrorCode } from '@onekeyfe/hd-shared';
import {
  getOneKeyDevices,
  getOneKeyFirstOneKeyDevice,
  isOneKeyDisconnectError,
} from '@/ui/utils/onekey';

jest.mock('i18next', () => ({ t: (key: string) => key }));

const pro2 = { vendorId: 0x1209, productId: 0x4f4c };
const classic = { vendorId: 0x1209, productId: 0x53c1 };
const trezor = { ...classic, manufacturerName: 'SatoshiLabs' };

describe('OneKey USB device selection', () => {
  const usb = { getDevices: jest.fn(), requestDevice: jest.fn() };
  const original = Object.getOwnPropertyDescriptor(navigator, 'usb');
  beforeEach(() => {
    jest.resetAllMocks();
    Object.defineProperty(navigator, 'usb', { configurable: true, value: usb });
  });
  afterEach(() => {
    if (original) Object.defineProperty(navigator, 'usb', original);
    else Reflect.deleteProperty(navigator, 'usb');
  });

  it('recognizes both generations and skips other devices sharing a vendor or product ID', async () => {
    usb.getDevices.mockResolvedValue([
      trezor,
      { ...classic, productId: 1 },
      pro2,
      classic,
    ]);
    await expect(getOneKeyDevices()).resolves.toEqual([pro2, classic]);
    await expect(getOneKeyFirstOneKeyDevice()).resolves.toBe(pro2);
    expect(usb.requestDevice).not.toHaveBeenCalled();
  });

  it('checks the device returned by the browser picker', async () => {
    usb.getDevices.mockResolvedValue([]);
    usb.requestDevice.mockResolvedValueOnce(trezor).mockResolvedValueOnce(pro2);
    await expect(getOneKeyFirstOneKeyDevice()).rejects.toThrow(
      'notFoundDevice'
    );
    await expect(getOneKeyFirstOneKeyDevice()).resolves.toBe(pro2);
    expect(usb.requestDevice).toHaveBeenCalledWith({
      filters: expect.arrayContaining([pro2, classic]),
    });
  });

  it('reports unavailable WebUSB when the user requests a device', async () => {
    Reflect.deleteProperty(navigator, 'usb');
    await expect(getOneKeyDevices()).resolves.toEqual([]);
    await expect(getOneKeyFirstOneKeyDevice()).rejects.toThrow(
      'webUSBUnavailable'
    );
  });
});

it('recognizes disconnects across the SDK, RPC and UI error representations', () => {
  const code = HardwareErrorCode.DeviceNotFound;
  for (const value of [
    { code },
    { errorCode: String(code) },
    new Error(`${code}: localized`),
    'DISCONNECTED',
  ]) {
    expect(isOneKeyDisconnectError(value)).toBe(true);
  }
  for (const value of [
    null,
    { code: HardwareErrorCode.PinInvalid },
    '117: busy',
    'user rejected',
  ]) {
    expect(isOneKeyDisconnectError(value)).toBe(false);
  }
});
