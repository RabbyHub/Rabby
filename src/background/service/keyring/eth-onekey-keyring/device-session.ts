import type { DeviceState, Response } from '@onekeyfe/hd-core';
import { HardwareErrorCode } from '@onekeyfe/hd-shared';
import { t } from 'i18next';
import eventBus from '@/eventBus';
import { EVENTS } from '@/constant';
import type { OneKeyBridgeInterface } from './onekey-bridge-interface';

const errorMessages = {
  [HardwareErrorCode.DeviceNotFound]: 'notFoundDevice',
  [HardwareErrorCode.WebDeviceNotFoundOrNeedsPermission]:
    'deviceNeedsWebHIDPermission',
  [HardwareErrorCode.DeviceInterruptedFromOutside]: 'deviceInterrupted',
  [HardwareErrorCode.DeviceInterruptedFromUser]: 'deviceInterrupted',
  [HardwareErrorCode.ActionCancelled]: 'actionCancel',
  [HardwareErrorCode.CallQueueActionCancelled]: 'actionCancel',
  [HardwareErrorCode.PinCancelled]: 'actionCancel',
  [HardwareErrorCode.PinInvalid]: 'pinInvalid',
  [HardwareErrorCode.DeviceBusy]: 'deviceBusy',
  [HardwareErrorCode.DeviceInitializeFailed]: 'deviceInitializeFailed',
  [HardwareErrorCode.NewFirmwareForceUpdate]: 'needUpgradeFirmware',
  [HardwareErrorCode.CallMethodNeedUpgradeFirmware]:
    'thisMethodNeedUpgradeFirmware',
  [HardwareErrorCode.NotAllowInBootloaderMode]: 'notAllowInBootloaderMode',
  [HardwareErrorCode.DeviceDetectInBootloaderMode]: 'notAllowInBootloaderMode',
  [HardwareErrorCode.DeviceCheckPassphraseStateError]:
    'deviceCheckPassphraseStateError',
  [HardwareErrorCode.DeviceCheckUnlockTypeError]:
    'deviceCheckPassphraseStateError',
  [HardwareErrorCode.DeviceNotOpenedPassphrase]: 'deviceNotOpenedPassphrase',
};

export class OneKeyError extends Error {
  constructor(readonly code: number | string, readonly detail: string) {
    const key: string | undefined = errorMessages[code];
    super(`${code}: ${key ? t('background.keyring.onekey.' + key) : detail}`);
    if (Number(code) === HardwareErrorCode.WebDeviceNotFoundOrNeedsPermission) {
      eventBus.emit(EVENTS.broadcastToUI, {
        method: EVENTS.ONEKEY.REQUEST_PERMISSION_WEBUSB,
      });
    }
  }
}

export function checkOperation(signal: AbortSignal) {
  if (signal.aborted) throw new Error('OneKey operation cancelled');
}

export async function whileActive<T>(
  signal: AbortSignal,
  call: () => Promise<T>
): Promise<T> {
  checkOperation(signal);
  let abort!: () => void;
  try {
    // A disconnected device need not acknowledge cancel. Release the caller
    // immediately and still consume any eventual result or rejection.
    const value = await new Promise<T>((resolve, reject) => {
      abort = () => reject(new Error('OneKey operation cancelled'));
      signal.addEventListener('abort', abort, { once: true });
      call().then(resolve, reject);
    });
    checkOperation(signal);
    return value;
  } finally {
    signal.removeEventListener('abort', abort);
  }
}

// SDK transports can reject or resolve with a failure payload.
export async function readDevice<T>(
  signal: AbortSignal,
  call: () => Response<T>
): Promise<T> {
  try {
    const result = await whileActive(signal, call);
    if (result.success) return result.payload;
    throw result.payload;
  } catch (error) {
    checkOperation(signal);
    const code = error?.code ?? error?.errorCode;
    if (code != null)
      throw new OneKeyError(
        code,
        error.error ?? error.message ?? String(error)
      );
    throw error instanceof Error
      ? error
      : new Error(error?.error ?? error?.message ?? String(error));
  }
}

export function passphraseDisabled(error: unknown) {
  return error instanceof OneKeyError
    ? Number(error.code) === HardwareErrorCode.DeviceNotOpenedPassphrase ||
        /passphrase disabled/i.test(error.detail)
    : error instanceof Error && /passphrase disabled/i.test(error.message);
}

function unsupportedSession(error: Error) {
  const code = error instanceof OneKeyError ? error.code : undefined;
  return (
    Number(code) === HardwareErrorCode.DeviceNotSupportMethod ||
    Number(code) === -32601 ||
    ['MethodNotFound', 'MethodNotAllowed'].includes(String(code)) ||
    /not supported|unsupported|method not found|method not allowed/i.test(
      error.message
    )
  );
}

export function deviceCancelled(error: unknown) {
  return (
    (error instanceof OneKeyError &&
      [
        HardwareErrorCode.ActionCancelled,
        HardwareErrorCode.PinCancelled,
        HardwareErrorCode.CallQueueActionCancelled,
        HardwareErrorCode.DeviceInterruptedFromOutside,
        HardwareErrorCode.DeviceInterruptedFromUser,
      ].some((code) => code === Number(error.code))) ||
    (error instanceof Error && /action cancel(?:led|ed)/i.test(error.message))
  );
}

export async function selectWallet(
  bridge: OneKeyBridgeInterface,
  connectId: string,
  device: DeviceState,
  signal: AbortSignal
): Promise<string | undefined> {
  const v2 = device.protocol === 'V2';
  const standardOnly = device.status?.passphraseProtection === false;
  const mainPin =
    device.status?.unlocked === true &&
    device.status.unlockedAttachPin === false;
  const standardIdentity = () =>
    readDevice(signal, () =>
      bridge.getPassphraseState(connectId, { useEmptyPassphrase: true })
    );
  let walletId: string | undefined;
  let opened = false;

  if (v2 && (standardOnly || !mainPin) && bridge.openWalletSession) {
    try {
      const open = (mode: 'standard' | 'select-hidden') =>
        readDevice(signal, () => bridge.openWalletSession(connectId, { mode }));
      const session = await open(
        standardOnly ? 'standard' : 'select-hidden'
      ).catch((error) => {
        if (!standardOnly && passphraseDisabled(error)) return open('standard');
        throw error;
      });
      if (session.walletType === 'standard' || standardOnly) return undefined;
      walletId = session.passphraseState || undefined;
      opened = true;
    } catch (error) {
      if (!unsupportedSession(error)) throw error;
    }
  }
  if (!opened) {
    if (standardOnly) {
      await standardIdentity();
      return undefined;
    }
    try {
      walletId =
        (await readDevice(signal, () =>
          bridge.getPassphraseState(connectId)
        )) || undefined;
    } catch (error) {
      if (!passphraseDisabled(error)) throw error;
      await standardIdentity();
      return undefined;
    }
  }

  if (!walletId || !v2 || (!opened && device.status?.unlockedAttachPin))
    return walletId;
  // The SDK also reports an empty passphrase as a hidden wallet. An attach-PIN
  // session is already identified and probing it would ask for an extra main PIN.
  try {
    const current = await readDevice(signal, () =>
      bridge.getDeviceState(connectId)
    );
    if (current.status?.unlockedAttachPin) return walletId;
  } catch (error) {
    checkOperation(signal);
    if (deviceCancelled(error)) throw error;
  }
  try {
    return (await standardIdentity()) === walletId ? undefined : walletId;
  } catch (error) {
    checkOperation(signal);
    if (deviceCancelled(error)) throw error;
    return walletId;
  }
}
