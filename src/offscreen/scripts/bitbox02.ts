import BitBox02Bridge from '@/background/service/keyring/eth-bitbox02-keyring/bitbox02-bridge';
import {
  BitBox02Action,
  OffscreenCommunicationTarget,
  OffscreenCommunicationEvents,
} from '@/constant/offscreen-communication';
import browser from 'webextension-polyfill';
import * as bitbox from 'bitbox-api';

export function initBitBox02() {
  const bridge = new BitBox02Bridge();

  chrome.runtime.onMessage.addListener(
    (
      msg: {
        target: string;
        action: BitBox02Action;
        params: any[];
      },
      _sender,
      sendResponse
    ) => {
      if (msg.target !== OffscreenCommunicationTarget.bitbox02Offscreen) {
        return;
      }

      const onCloseCb = () => {
        browser.runtime.sendMessage({
          target: OffscreenCommunicationTarget.extension,
          event: OffscreenCommunicationEvents.bitbox02DeviceConnect,
          payload: {
            name: 'close-popup',
          },
        });
      };

      const init = async () => {
        try {
          const device = await bitbox.bitbox02ConnectBridge(onCloseCb);
          const pairing = await device.unlockAndPair();
          const pairingCode = pairing.getPairingCode();
          if (pairingCode) {
            await browser.runtime.sendMessage({
              target: OffscreenCommunicationTarget.extension,
              event: OffscreenCommunicationEvents.bitbox02DeviceConnect,
              payload: {
                name: 'open-popup',
                pairingCode: pairingCode,
              },
            });
          }
          bridge.app = await pairing.waitConfirm();
          onCloseCb();
          bridge.isDeviceConnected = true;
          const rootPub = await bridge.app.ethXpub(msg.params[0]);
          await browser.runtime.sendMessage({
            target: OffscreenCommunicationTarget.extension,
            event: OffscreenCommunicationEvents.bitbox02DeviceConnect,
            payload: {
              name: 'pub-key',
              pubKey: rootPub,
            },
          });

          if (!bridge.app.ethSupported()) {
            sendResponse({ error: 'Unsupported device' });
          }
          sendResponse();
        } catch (err) {
          console.error(err);
          if (bridge.app) {
            bridge.app.close();
          }
          sendResponse({ error: err });
        }
      };

      switch (msg.action) {
        case BitBox02Action.init:
          init();
          break;

        case BitBox02Action.ethSign1559Transaction:
          bridge
            .ethSign1559Transaction(...(msg.params as [any, any]))
            .then(sendResponse)
            .catch((err) => {
              sendResponse({ error: err });
            });
          break;

        case BitBox02Action.ethSignMessage:
          bridge
            .ethSignMessage(...(msg.params as [any, any, any]))
            .then(sendResponse)
            .catch((err) => {
              sendResponse({ error: err });
            });
          break;

        case BitBox02Action.ethSignTransaction:
          bridge
            .ethSignTransaction(...(msg.params as [any, any, any]))
            .then(sendResponse)
            .catch((err) => {
              sendResponse({ error: err });
            });
          break;

        case BitBox02Action.ethSignTypedMessage:
          bridge
            .ethSignTypedMessage(...(msg.params as [any, any, any]))
            .then(sendResponse)
            .catch((err) => {
              sendResponse({ error: err });
            });
          break;

        default:
          sendResponse({
            success: false,
            payload: {
              error: 'BitBox02 action not supported',
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
