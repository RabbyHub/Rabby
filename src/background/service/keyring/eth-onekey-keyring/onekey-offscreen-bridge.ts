import { OneKeyBridgeInterface } from './onekey-bridge-interface';
import browser from 'webextension-polyfill';
import {
  OffscreenCommunicationTarget,
  OneKeyAction,
} from '@/constant/offscreen-communication';

function toRelayError(res: { error?: unknown; code?: unknown }) {
  const raw = res.error;
  const message =
    typeof raw === 'string'
      ? raw
      : raw && typeof raw === 'object' && 'message' in raw
      ? String((raw as { message?: unknown }).message)
      : raw === undefined
      ? 'Unknown OneKey error'
      : String(raw);
  const error = new Error(message);
  const code =
    res.code !== undefined
      ? res.code
      : raw && typeof raw === 'object' && 'code' in raw
      ? (raw as { code?: unknown }).code
      : undefined;
  if (code !== undefined) {
    (error as any).code = code;
  }
  return error;
}

export default class OneKeyOffscreenBridge implements OneKeyBridgeInterface {
  private async relay(action: OneKeyAction, params?: unknown[]) {
    const res = await browser.runtime.sendMessage({
      target: OffscreenCommunicationTarget.onekeyOffscreen,
      action,
      params,
    });
    if (
      res &&
      typeof res === 'object' &&
      'error' in res &&
      res.error !== undefined
    ) {
      throw toRelayError(res);
    }
    return res;
  }

  cancel: OneKeyBridgeInterface['cancel'] = async (...params) => {
    await this.relay(OneKeyAction.cancel, params);
  };

  init: OneKeyBridgeInterface['init'] = async () => {
    await this.relay(OneKeyAction.init);
  };

  getDeviceState: OneKeyBridgeInterface['getDeviceState'] = (...params) =>
    this.relay(OneKeyAction.getDeviceState, params);

  searchDevices: OneKeyBridgeInterface['searchDevices'] = () =>
    this.relay(OneKeyAction.searchDevices);

  evmGetPublicKey: OneKeyBridgeInterface['evmGetPublicKey'] = (...params) =>
    this.relay(OneKeyAction.evmGetPublicKey, params);

  evmSignMessage: OneKeyBridgeInterface['evmSignMessage'] = (...params) =>
    this.relay(OneKeyAction.evmSignMessage, params);

  evmSignTransaction: OneKeyBridgeInterface['evmSignTransaction'] = (
    ...params
  ) => this.relay(OneKeyAction.evmSignTransaction, params);

  evmSignTypedData: OneKeyBridgeInterface['evmSignTypedData'] = (...params) =>
    this.relay(OneKeyAction.evmSignTypedData, params);

  getPassphraseState: OneKeyBridgeInterface['getPassphraseState'] = (
    ...params
  ) => this.relay(OneKeyAction.getPassphraseState, params);

  openWalletSession: OneKeyBridgeInterface['openWalletSession'] = (...params) =>
    this.relay(OneKeyAction.openWalletSession, params);
}
