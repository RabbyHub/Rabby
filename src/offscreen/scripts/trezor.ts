import TrezorConnect from '@trezor/connect-web';

import {
  OffscreenCommunicationEvents,
  OffscreenCommunicationTarget,
  TrezorAction,
} from '@/constant/offscreen-communication';

import { installTrezorBrowserApi } from './trezor-browser-api';

type TrezorRequest = {
  target: OffscreenCommunicationTarget;
  action: TrezorAction;
  params?: any;
};

const forwardDeviceEvent = (event: any) => {
  chrome.runtime.sendMessage({
    target: OffscreenCommunicationTarget.extension,
    event: OffscreenCommunicationEvents.trezorDeviceEvent,
    payload: event,
  });
};

let initialization: Promise<void> | undefined;
let initializationConfig: TrezorRequest['params'];
let disposal: Promise<void> | undefined;

const ensureInitialized = async (params?: TrezorRequest['params']) => {
  if (params !== undefined) {
    initializationConfig = params;
  }

  if (disposal) {
    await disposal;
  }

  if (initializationConfig === undefined) {
    throw new Error('Trezor Connect is not initialized');
  }

  if (!initialization) {
    const attempt = (async () => {
      try {
        TrezorConnect.on('DEVICE_EVENT', forwardDeviceEvent);
        await TrezorConnect.init({
          ...initializationConfig,
          coreMode: 'auto',
          env: 'webextension',
        });
      } catch (error) {
        try {
          await TrezorConnect.dispose();
        } catch {
          // Preserve the initialization error that caused the cleanup.
        }
        throw error;
      }
    })();

    initialization = attempt;
    void attempt.catch(() => {
      if (initialization === attempt) {
        initialization = undefined;
      }
    });
  }

  return initialization;
};

const invokeAfterInit = async <T>(operation: () => Promise<T>) => {
  await ensureInitialized();
  return operation();
};

const dispose = () => {
  if (disposal) {
    return disposal;
  }

  const pendingInitialization = initialization;
  initialization = undefined;

  const attempt = (async () => {
    await pendingInitialization?.catch(() => undefined);
    await TrezorConnect.dispose();
  })();

  disposal = attempt;
  void attempt
    .finally(() => {
      if (disposal === attempt) {
        disposal = undefined;
      }
    })
    .catch(() => undefined);

  return attempt;
};

export function initTrezor() {
  installTrezorBrowserApi();

  chrome.runtime.onMessage.addListener(
    (msg: TrezorRequest, sender, sendResponse) => {
      if (
        sender.id !== chrome.runtime.id ||
        msg.target !== OffscreenCommunicationTarget.trezorOffscreen
      ) {
        return;
      }

      const respond = (operation: Promise<unknown>) => {
        operation.then(sendResponse).catch((error) =>
          sendResponse({
            error: error instanceof Error ? error.message : String(error),
          })
        );
      };

      switch (msg.action) {
        case TrezorAction.init:
          respond(ensureInitialized(msg.params));
          break;
        case TrezorAction.dispose:
          respond(dispose());
          break;
        case TrezorAction.getPublicKey:
          respond(
            invokeAfterInit(() => TrezorConnect.getPublicKey(msg.params))
          );
          break;
        case TrezorAction.ethereumSignTransaction:
          respond(
            invokeAfterInit(() =>
              TrezorConnect.ethereumSignTransaction(msg.params)
            )
          );
          break;
        case TrezorAction.ethereumSignMessage:
          respond(
            invokeAfterInit(() => TrezorConnect.ethereumSignMessage(msg.params))
          );
          break;
        case TrezorAction.ethereumSignTypedData:
          respond(
            invokeAfterInit(() =>
              TrezorConnect.ethereumSignTypedData(msg.params)
            )
          );
          break;
        default:
          sendResponse({ error: 'Trezor action not supported' });
      }

      return true;
    }
  );
}
