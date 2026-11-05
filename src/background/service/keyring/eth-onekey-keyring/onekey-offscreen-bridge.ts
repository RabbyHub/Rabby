import { OneKeyBridgeInterface } from './onekey-bridge-interface';
import browser from 'webextension-polyfill';
import {
  OffscreenCommunicationTarget,
  OneKeyAction,
} from '@/constant/offscreen-communication';

export default class OneKeyOffscreenBridge implements OneKeyBridgeInterface {
  cancel: OneKeyBridgeInterface['cancel'] = async (...params) => {
    const res = await browser.runtime.sendMessage({
      target: OffscreenCommunicationTarget.onekeyOffscreen,
      action: OneKeyAction.cancel,
      params,
    });
    if (res?.error) {
      throw new Error(res.error);
    }
  };

  init: OneKeyBridgeInterface['init'] = async () => {
    return new Promise((resolve, reject) => {
      browser.runtime
        .sendMessage({
          target: OffscreenCommunicationTarget.onekeyOffscreen,
          action: OneKeyAction.init,
        })
        .then((res) => {
          if (res?.error) {
            reject(res.error);
          } else {
            resolve(res);
          }
        });
    });
  };

  getDeviceState: OneKeyBridgeInterface['getDeviceState'] = (...params) => {
    return new Promise((resolve, reject) => {
      browser.runtime
        .sendMessage({
          target: OffscreenCommunicationTarget.onekeyOffscreen,
          action: OneKeyAction.getDeviceState,
          params,
        })
        .then((res) => {
          if (res?.error) {
            reject(res.error);
          } else {
            resolve(res);
          }
        });
    });
  };

  searchDevices: OneKeyBridgeInterface['searchDevices'] = () => {
    return new Promise((resolve, reject) => {
      browser.runtime
        .sendMessage({
          target: OffscreenCommunicationTarget.onekeyOffscreen,
          action: OneKeyAction.searchDevices,
        })
        .then((res) => {
          if (res?.error) {
            reject(res.error);
          } else {
            resolve(res);
          }
        });
    });
  };

  evmGetPublicKey: OneKeyBridgeInterface['evmGetPublicKey'] = (
    ...params
  ): any => {
    return new Promise((resolve, reject) => {
      browser.runtime
        .sendMessage({
          target: OffscreenCommunicationTarget.onekeyOffscreen,
          action: OneKeyAction.evmGetPublicKey,
          params,
        })
        .then((res) => {
          if (res?.error) {
            reject(res.error);
          } else {
            resolve(res);
          }
        });
    });
  };

  evmSignMessage: OneKeyBridgeInterface['evmSignMessage'] = (
    ...params
  ): any => {
    return new Promise((resolve, reject) => {
      browser.runtime
        .sendMessage({
          target: OffscreenCommunicationTarget.onekeyOffscreen,
          action: OneKeyAction.evmSignMessage,
          params,
        })
        .then((res) => {
          if (res?.error) {
            reject(res.error);
          } else {
            resolve(res);
          }
        });
    });
  };

  evmSignTransaction: OneKeyBridgeInterface['evmSignTransaction'] = (
    ...params
  ): any => {
    return new Promise((resolve, reject) => {
      browser.runtime
        .sendMessage({
          target: OffscreenCommunicationTarget.onekeyOffscreen,
          action: OneKeyAction.evmSignTransaction,
          params,
        })
        .then((res) => {
          if (res?.error) {
            reject(res.error);
          } else {
            resolve(res);
          }
        });
    });
  };

  evmSignTypedData: OneKeyBridgeInterface['evmSignTypedData'] = (
    ...params
  ): any => {
    return new Promise((resolve, reject) => {
      browser.runtime
        .sendMessage({
          target: OffscreenCommunicationTarget.onekeyOffscreen,
          action: OneKeyAction.evmSignTypedData,
          params,
        })
        .then((res) => {
          if (res?.error) {
            reject(res.error);
          } else {
            resolve(res);
          }
        });
    });
  };

  getPassphraseState: OneKeyBridgeInterface['getPassphraseState'] = (
    ...params
  ): any => {
    return new Promise((resolve, reject) => {
      browser.runtime
        .sendMessage({
          target: OffscreenCommunicationTarget.onekeyOffscreen,
          action: OneKeyAction.getPassphraseState,
          params,
        })
        .then((res) => {
          if (res?.error) {
            reject(res.error);
          } else {
            resolve(res);
          }
        });
    });
  };
}
