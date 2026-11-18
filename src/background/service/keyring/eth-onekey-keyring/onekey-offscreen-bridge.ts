import browser from 'webextension-polyfill';
import {
  OffscreenCommunicationTarget,
  OneKeyAction,
} from '@/constant/offscreen-communication';
import { OneKeyBridgeInterface } from './onekey-bridge-interface';

const relay = (action: OneKeyAction) => async (...params: unknown[]) => {
  const response = await browser.runtime.sendMessage({
    target: OffscreenCommunicationTarget.onekeyOffscreen,
    action,
    params,
  });
  if (typeof response?.error === 'string') {
    throw Object.assign(new Error(response.error), { code: response.code });
  }
  return response;
};

export default class OneKeyOffscreenBridge implements OneKeyBridgeInterface {
  init = relay(OneKeyAction.init);
  searchDevices = relay(OneKeyAction.searchDevices);
  getDeviceState = relay(OneKeyAction.getDeviceState);
  openWalletSession = relay(OneKeyAction.openWalletSession);
  getPassphraseState = relay(OneKeyAction.getPassphraseState);
  evmGetPublicKey = relay(OneKeyAction.evmGetPublicKey);
  evmSignMessage = relay(OneKeyAction.evmSignMessage);
  evmSignTransaction = relay(OneKeyAction.evmSignTransaction);
  evmSignTypedData = relay(OneKeyAction.evmSignTypedData);
  cancel = relay(OneKeyAction.cancel);
}
