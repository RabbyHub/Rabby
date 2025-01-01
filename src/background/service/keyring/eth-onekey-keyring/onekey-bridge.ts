import { UI_EVENT, UI_REQUEST, UI_RESPONSE } from '@onekeyfe/hd-core';
import { OneKeyBridgeInterface } from './onekey-bridge-interface';
import HardwareSDK from '@onekeyfe/hd-web-sdk';
const { HardwareWebSdk } = HardwareSDK;

export default class OneKeyBridge implements OneKeyBridgeInterface {
  init: OneKeyBridgeInterface['init'] = async () => {
    HardwareWebSdk.init({
      debug: false,
      // The official iframe page deployed by OneKey
      // of course you can also deploy it yourself
      connectSrc: 'https://jssdk.onekey.so/0.3.48/',
    });
    HardwareWebSdk.on(UI_EVENT, (e) => {
      switch (e.type) {
        case UI_REQUEST.REQUEST_PIN:
          HardwareWebSdk.uiResponse({
            type: UI_RESPONSE.RECEIVE_PIN,
            payload: '@@ONEKEY_INPUT_PIN_IN_DEVICE',
          });
          break;
        case UI_REQUEST.REQUEST_PASSPHRASE:
          HardwareWebSdk.uiResponse({
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
  };

  evmSignTransaction = HardwareWebSdk.evmSignTransaction;

  evmSignMessage = HardwareWebSdk.evmSignMessage;

  evmSignTypedData = HardwareWebSdk.evmSignTypedData;

  searchDevices = HardwareWebSdk.searchDevices;

  getPassphraseState = HardwareWebSdk.getPassphraseState;

  evmGetPublicKey = HardwareWebSdk.evmGetPublicKey;
}
