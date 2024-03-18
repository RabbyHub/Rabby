import ImKeyBridge from '@/background/service/keyring/eth-imkey-keyring/imkey-bridge';
import {
  ImKeyAction,
  OffscreenCommunicationTarget,
} from '@/constant/offscreen-communication';

export function initImKey() {
  const bridge = new ImKeyBridge();

  chrome.runtime.onMessage.addListener(
    (
      msg: {
        target: string;
        action: ImKeyAction;
        params: any[];
      },
      _sender,
      sendResponse
    ) => {
      if (msg.target !== OffscreenCommunicationTarget.imkeyOffscreen) {
        return;
      }

      switch (msg.action) {
        case ImKeyAction.unlock:
          bridge
            .unlock()
            .then(sendResponse)
            .catch((err) => {
              sendResponse({ error: err });
            });
          break;

        case ImKeyAction.cleanUp:
          bridge
            .cleanUp()
            .then(sendResponse)
            .catch((err) => {
              sendResponse({ error: err });
            });
          break;

        case ImKeyAction.invokeApp:
          bridge
            .invokeApp(...(msg.params as [any, any]))
            .then(sendResponse)
            .catch((err) => {
              sendResponse({ error: err });
            });
          break;

        default:
          sendResponse({
            success: false,
            payload: {
              error: 'ImKey action not supported',
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
