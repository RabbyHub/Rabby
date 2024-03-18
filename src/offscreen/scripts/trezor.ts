import TrezorBridge from '@rabby-wallet/eth-trezor-keyring/dist/trezor-bridge';
import {
  TrezorAction,
  OffscreenCommunicationTarget,
  OffscreenCommunicationEvents,
} from '@/constant/offscreen-communication';
import TrezorConnect from '@trezor/connect-web';
import browser from 'webextension-polyfill';

export function initTrezor() {
  const bridge = new TrezorBridge();

  chrome.runtime.onMessage.addListener(
    (
      msg: {
        target: string;
        action: TrezorAction;
        params: any[];
      },
      _sender,
      sendResponse
    ) => {
      if (msg.target !== OffscreenCommunicationTarget.trezorOffscreen) {
        return;
      }

      switch (msg.action) {
        case TrezorAction.init:
          TrezorConnect.on('DEVICE_EVENT', (event: any) => {
            browser.runtime.sendMessage({
              target: OffscreenCommunicationTarget.extension,
              event: OffscreenCommunicationEvents.trezorDeviceConnect,
              payload: event,
            });
          });

          TrezorConnect.init(msg.params[0]);
          break;

        case TrezorAction.dispose:
          bridge
            .dispose()
            .then(sendResponse)
            .catch((err) => {
              sendResponse({ error: err });
            });
          break;

        case TrezorAction.getPublicKey:
          bridge
            .getPublicKey(...(msg.params as [any]))
            .then(sendResponse)
            .catch((err) => {
              sendResponse({ error: err });
            });
          break;

        case TrezorAction.ethereumSignMessage:
          bridge
            .ethereumSignMessage(...(msg.params as [any]))
            .then(sendResponse)
            .catch((err) => {
              sendResponse({ error: err });
            });
          break;

        case TrezorAction.ethereumSignTransaction:
          bridge
            .ethereumSignTransaction(...(msg.params as [any]))
            .then(sendResponse)
            .catch((err) => {
              sendResponse({ error: err });
            });
          break;

        case TrezorAction.ethereumSignTypedData:
          bridge
            .ethereumSignTypedData(...(msg.params as [any]))
            .then(sendResponse)
            .catch((err) => {
              sendResponse({ error: err });
            });
          break;

        default:
          sendResponse({
            success: false,
            payload: {
              error: 'Trezor action not supported',
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
