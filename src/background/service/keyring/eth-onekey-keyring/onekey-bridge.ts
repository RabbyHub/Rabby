import { UI_EVENT, UI_REQUEST, UI_RESPONSE } from '@onekeyfe/hd-core';
import { OneKeyBridgeInterface } from './onekey-bridge-interface';
import HardwareSDK from '@onekeyfe/hd-web-sdk';
const { HardwareWebSdk } = HardwareSDK;

let initPromise: Promise<void> | undefined;

export default class OneKeyBridge implements OneKeyBridgeInterface {
  init: OneKeyBridgeInterface['init'] = () => {
    if (!initPromise) {
      initPromise = HardwareWebSdk.init({
        debug: false,
        // The official iframe page deployed by OneKey
        // of course you can also deploy it yourself
        connectSrc: 'https://jssdk.onekey.so/1.2.7/',
        env: 'webusb',
        fetchConfig: true,
      })
        .then((initialized) => {
          if (!initialized) {
            throw new Error('OneKey SDK initialization failed');
          }
          HardwareWebSdk.on(UI_EVENT, (e) => {
            switch (e.type) {
              case UI_REQUEST.REQUEST_PIN:
                if (
                  e.payload.deviceOnly ||
                  e.payload.interaction?.protocol === 'V2'
                ) {
                  break;
                }
                HardwareWebSdk.uiResponse({
                  ...e.payload.responseCorrelation,
                  type: UI_RESPONSE.RECEIVE_PIN,
                  payload: '@@ONEKEY_INPUT_PIN_IN_DEVICE',
                });
                break;
              case UI_REQUEST.REQUEST_PASSPHRASE:
                HardwareWebSdk.uiResponse({
                  ...e.payload.responseCorrelation,
                  type: UI_RESPONSE.RECEIVE_PASSPHRASE,
                  payload: {
                    value: '',
                    passphraseOnDevice: true,
                    save: true,
                  },
                });
                break;
              default:
              // NOTHING
            }
          });
        })
        .catch((error) => {
          initPromise = undefined;
          throw error;
        });
    }

    return initPromise;
  };

  evmSignTransaction = HardwareWebSdk.evmSignTransaction;

  evmSignMessage = HardwareWebSdk.evmSignMessage;

  evmSignTypedData = HardwareWebSdk.evmSignTypedData;

  searchDevices = HardwareWebSdk.searchDevices;

  getPassphraseState = HardwareWebSdk.getPassphraseState;

  evmGetPublicKey = HardwareWebSdk.evmGetPublicKey;

  getDeviceState = HardwareWebSdk.getDeviceState;
}
