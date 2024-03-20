import { TrezorBridgeInterface } from '@rabby-wallet/eth-trezor-keyring/dist/trezor-bridge-interface';
import browser from 'webextension-polyfill';
import {
  OffscreenCommunicationEvents,
  OffscreenCommunicationTarget,
  TrezorAction,
} from '@/constant/offscreen-communication';
import EventEmitter from 'events';

export default class TrezorOffscreenBridge implements TrezorBridgeInterface {
  isDeviceConnected = false;
  model = '';
  connectDevices = new Set<string>();
  event = new EventEmitter();

  init: TrezorBridgeInterface['init'] = async (config) => {
    chrome.runtime.onMessage.addListener((msg) => {
      if (
        msg.target === OffscreenCommunicationTarget.extension &&
        msg.event === OffscreenCommunicationEvents.trezorDeviceConnect
      ) {
        const event = msg.payload;
        if (event && event.payload && event.payload.features) {
          this.model = event.payload.features.model;
        }
        const currentDeviceId = event.payload?.id;
        if (event.type === 'device-connect') {
          this.connectDevices.add(currentDeviceId);
          this.event.emit('cleanUp', true);
        }
        if (event.type === 'device-disconnect') {
          this.connectDevices.delete(currentDeviceId);
          this.event.emit('cleanUp', true);
        }
      }

      return true;
    });

    if (this.isDeviceConnected) {
      return;
    }

    return new Promise((resolve, reject) => {
      browser.runtime
        .sendMessage({
          target: OffscreenCommunicationTarget.trezorOffscreen,
          action: TrezorAction.init,
          params: [
            {
              ...config,
              env: 'web',
            },
          ],
        })
        .then((res) => {
          if (res?.error) {
            reject(res.error);
          } else {
            this.isDeviceConnected = true;

            resolve(res);
          }
        });
    });
  };

  dispose: TrezorBridgeInterface['dispose'] = () => {
    return new Promise((resolve, reject) => {
      browser.runtime
        .sendMessage({
          target: OffscreenCommunicationTarget.trezorOffscreen,
          action: TrezorAction.dispose,
        })
        .then((res) => {
          if (res?.error) {
            reject(res.error);
          } else {
            this.isDeviceConnected = false;
            resolve(res);
          }
        });
    });
  };

  getPublicKey: TrezorBridgeInterface['getPublicKey'] = (...params): any => {
    return new Promise((resolve, reject) => {
      browser.runtime
        .sendMessage({
          target: OffscreenCommunicationTarget.trezorOffscreen,
          action: TrezorAction.getPublicKey,
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

  ethereumSignMessage: TrezorBridgeInterface['ethereumSignMessage'] = (
    ...params
  ): any => {
    return new Promise((resolve, reject) => {
      browser.runtime
        .sendMessage({
          target: OffscreenCommunicationTarget.trezorOffscreen,
          action: TrezorAction.ethereumSignMessage,
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

  ethereumSignTransaction: TrezorBridgeInterface['ethereumSignTransaction'] = (
    ...params
  ): any => {
    return new Promise((resolve, reject) => {
      browser.runtime
        .sendMessage({
          target: OffscreenCommunicationTarget.trezorOffscreen,
          action: TrezorAction.ethereumSignTransaction,
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

  ethereumSignTypedData: TrezorBridgeInterface['ethereumSignTypedData'] = (
    ...params
  ): any => {
    return new Promise((resolve, reject) => {
      browser.runtime
        .sendMessage({
          target: OffscreenCommunicationTarget.trezorOffscreen,
          action: TrezorAction.ethereumSignTypedData,
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
