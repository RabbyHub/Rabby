import { ImKeyBridgeInterface } from './imkey-bridge-interface';
import browser from 'webextension-polyfill';
import {
  OffscreenCommunicationTarget,
  ImKeyAction,
} from '@/constant/offscreen-communication';

export default class ImKeyOffscreenBridge implements ImKeyBridgeInterface {
  unlock: ImKeyBridgeInterface['unlock'] = () => {
    return new Promise((resolve, reject) => {
      browser.runtime
        .sendMessage({
          target: OffscreenCommunicationTarget.imkeyOffscreen,
          action: ImKeyAction.unlock,
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
  cleanUp: ImKeyBridgeInterface['cleanUp'] = () => {
    return new Promise((resolve, reject) => {
      browser.runtime
        .sendMessage({
          target: OffscreenCommunicationTarget.imkeyOffscreen,
          action: ImKeyAction.cleanUp,
        })
        .then((res) => {
          if (res?.error) {
            reject(res.error);
          } else {
            resolve();
          }
        });
    });
  };
  invokeApp: ImKeyBridgeInterface['invokeApp'] = (...params): any => {
    return new Promise((resolve, reject) => {
      browser.runtime
        .sendMessage({
          target: OffscreenCommunicationTarget.imkeyOffscreen,
          action: ImKeyAction.invokeApp,
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
