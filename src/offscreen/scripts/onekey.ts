import OneKeyBridge from '@/background/service/keyring/eth-onekey-keyring/onekey-bridge';
import {
  OneKeyAction,
  OffscreenCommunicationTarget,
} from '@/constant/offscreen-communication';

export function initOneKey() {
  const bridge = new OneKeyBridge();

  chrome.runtime.onMessage.addListener(
    (
      msg: {
        target: string;
        action: OneKeyAction;
        params: any[];
      },
      _sender,
      sendResponse
    ) => {
      if (msg.target !== OffscreenCommunicationTarget.onekeyOffscreen) {
        return;
      }

      switch (msg.action) {
        case OneKeyAction.init:
          bridge
            .init()
            .then(sendResponse)
            .catch((err) => {
              sendResponse({ error: err });
            });
          break;

        case OneKeyAction.searchDevices:
          bridge
            .searchDevices()
            .then(sendResponse)
            .catch((err) => {
              sendResponse({ error: err });
            });
          break;

        case OneKeyAction.evmGetPublicKey:
          bridge
            .evmGetPublicKey(...(msg.params as [string, string, any]))
            .then(sendResponse)
            .catch((err) => {
              sendResponse({ error: err });
            });
          break;

        case OneKeyAction.getPassphraseState:
          bridge
            .getPassphraseState(...(msg.params as [string]))
            .then(sendResponse)
            .catch((err) => {
              sendResponse({ error: err });
            });
          break;

        case OneKeyAction.evmSignMessage:
          bridge
            .evmSignMessage(...(msg.params as [string, string, any]))
            .then(sendResponse)
            .catch((err) => {
              sendResponse({ error: err });
            });
          break;

        case OneKeyAction.evmSignTransaction:
          bridge
            .evmSignTransaction(...(msg.params as [string, string, any]))
            .then(sendResponse)
            .catch((err) => {
              sendResponse({ error: err });
            });
          break;

        case OneKeyAction.evmSignTypedData:
          bridge
            .evmSignTypedData(...(msg.params as [string, string, any]))
            .then(sendResponse)
            .catch((err) => {
              sendResponse({ error: err });
            });
          break;

        default:
          sendResponse({
            success: false,
            payload: {
              error: 'OneKey action not supported',
            },
          });
      }

      // This keeps sendResponse function valid after return
      // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/onMessage
      // eslint-disable-next-line consistent-return
      return true;
    }
  );
}
