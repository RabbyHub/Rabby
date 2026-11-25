import { UI_EVENT, UI_REQUEST, UI_RESPONSE } from '@onekeyfe/hd-core';
import { OneKeyBridgeInterface } from './onekey-bridge-interface';
import HardwareSDK from '@onekeyfe/hd-web-sdk';
import sdkPackage from '@onekeyfe/hd-web-sdk/package.json';
const { HardwareWebSdk } = HardwareSDK;

let initPromise: Promise<void> | undefined;

export default class OneKeyBridge implements OneKeyBridgeInterface {
  init: OneKeyBridgeInterface['init'] = () => {
    if (!initPromise) {
      initPromise = HardwareWebSdk.init({
        debug: false,
        connectSrc: `https://jssdk.onekey.so/${sdkPackage.version}/`,
        env: 'webusb',
        fetchConfig: false,
      })
        .then((initialized) => {
          if (initialized === false) {
            throw new Error('Unable to initialize the OneKey SDK iframe');
          }
          HardwareWebSdk.on(UI_EVENT, (e) => {
            switch (e.type) {
              case UI_REQUEST.REQUEST_PIN:
                // PIN button notifications have no pending SDK input request.
                if (
                  e.payload?.deviceOnly ||
                  e.payload?.interaction?.protocol === 'V2' ||
                  e.payload?.type === 'ButtonRequest_PinEntry' ||
                  e.payload?.type === 'ButtonRequest_AttachPin'
                ) {
                  break;
                }
                HardwareWebSdk.uiResponse({
                  ...e.payload?.responseCorrelation,
                  type: UI_RESPONSE.RECEIVE_PIN,
                  payload: '@@ONEKEY_INPUT_PIN_IN_DEVICE',
                });
                break;
              case UI_REQUEST.REQUEST_PASSPHRASE:
                HardwareWebSdk.uiResponse({
                  ...e.payload?.responseCorrelation,
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

  setDeviceConnectProtocol = HardwareWebSdk.setDeviceConnectProtocol;

  openWalletSession = HardwareWebSdk.openWalletSession;

  cancel: OneKeyBridgeInterface['cancel'] = async (connectId) => {
    HardwareWebSdk.cancel(connectId);
  };
}
