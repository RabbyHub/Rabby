import { BitBox02BridgeInterface } from './bitbox02-bridge-interface';
import browser from 'webextension-polyfill';
import {
  OffscreenCommunicationTarget,
  OffscreenCommunicationEvents,
  BitBox02Action,
} from '@/constant/offscreen-communication';
import * as HDKey from 'hdkey';

export default class BitBox02OffscreenBridge
  implements BitBox02BridgeInterface {
  isDeviceConnected = false;

  hdk: HDKey = new HDKey();

  private async openPopup(url) {
    await browser.windows.create({
      url,
      type: 'popup',
      width: 320,
      height: 175,
    });
  }

  private maybeClosePopup() {
    browser.runtime.sendMessage({ type: 'bitbox02', action: 'popup-close' });
  }

  init: BitBox02BridgeInterface['init'] = async (hdPath) => {
    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (
        msg.target === OffscreenCommunicationTarget.extension &&
        msg.event === OffscreenCommunicationEvents.bitbox02DeviceConnect
      ) {
        const event = msg.payload;
        if (event.name === 'open-popup') {
          this.openPopup(
            `vendor/bitbox02/bitbox02-pairing.html?code=${encodeURIComponent(
              event.pairingCode
            )}`
          ).then(sendResponse);
        }

        if (event.name === 'close-popup') {
          this.maybeClosePopup();
          sendResponse();
        }

        if (event.name === 'pub-key') {
          this.hdk = HDKey.fromExtendedKey(event.pubKey);
          sendResponse();
        }
      }

      return true;
    });

    return new Promise((resolve, reject) => {
      browser.runtime
        .sendMessage({
          target: OffscreenCommunicationTarget.bitbox02Offscreen,
          action: BitBox02Action.init,
          params: [hdPath],
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

  ethSign1559Transaction: BitBox02BridgeInterface['ethSign1559Transaction'] = async (
    ...params
  ) => {
    return new Promise((resolve, reject) => {
      browser.runtime
        .sendMessage({
          target: OffscreenCommunicationTarget.bitbox02Offscreen,
          action: BitBox02Action.ethSign1559Transaction,
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

  ethSignMessage: BitBox02BridgeInterface['ethSignMessage'] = async (
    ...params
  ) => {
    return new Promise((resolve, reject) => {
      browser.runtime
        .sendMessage({
          target: OffscreenCommunicationTarget.bitbox02Offscreen,
          action: BitBox02Action.ethSignMessage,
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

  ethSignTransaction: BitBox02BridgeInterface['ethSignTransaction'] = async (
    ...params
  ) => {
    return new Promise((resolve, reject) => {
      browser.runtime
        .sendMessage({
          target: OffscreenCommunicationTarget.bitbox02Offscreen,
          action: BitBox02Action.ethSignTransaction,
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

  ethSignTypedMessage: BitBox02BridgeInterface['ethSignTypedMessage'] = async (
    ...params
  ) => {
    return new Promise((resolve, reject) => {
      browser.runtime
        .sendMessage({
          target: OffscreenCommunicationTarget.bitbox02Offscreen,
          action: BitBox02Action.ethSignTypedMessage,
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
