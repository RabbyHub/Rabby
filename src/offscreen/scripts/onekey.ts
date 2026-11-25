import OneKeyBridge from '@/background/service/keyring/eth-onekey-keyring/onekey-bridge';
import {
  OneKeyAction,
  OffscreenCommunicationTarget,
} from '@/constant/offscreen-communication';
import { isPrivilegedOffscreenSender } from '@/utils/offscreenMessageSecurity';

type OneKeyMessage = {
  target: string;
  action: OneKeyAction;
  params?: unknown[];
};

export function initOneKey() {
  const bridge = new OneKeyBridge();
  const actions = new Map<OneKeyAction, (...args: any[]) => unknown>([
    [OneKeyAction.init, bridge.init],
    [OneKeyAction.searchDevices, bridge.searchDevices],
    [OneKeyAction.getDeviceState, bridge.getDeviceState],
    [
      OneKeyAction.setDeviceConnectProtocol,
      // Chrome serializes undefined array entries as null in runtime messages.
      (connectId, protocol) =>
        bridge.setDeviceConnectProtocol(connectId, protocol ?? undefined),
    ],
    [OneKeyAction.openWalletSession, bridge.openWalletSession],
    [OneKeyAction.getPassphraseState, bridge.getPassphraseState],
    [OneKeyAction.evmGetPublicKey, bridge.evmGetPublicKey],
    [OneKeyAction.evmSignMessage, bridge.evmSignMessage],
    [OneKeyAction.evmSignTransaction, bridge.evmSignTransaction],
    [OneKeyAction.evmSignTypedData, bridge.evmSignTypedData],
    [OneKeyAction.cancel, bridge.cancel],
  ]);

  chrome.runtime.onMessage.addListener(
    (msg: OneKeyMessage, sender, sendResponse) => {
      if (
        msg?.target !== OffscreenCommunicationTarget.onekeyOffscreen ||
        !isPrivilegedOffscreenSender(sender)
      ) {
        return;
      }

      const invoke = actions.get(msg.action);
      if (!invoke) {
        sendResponse({
          success: false,
          payload: { error: 'OneKey action not supported' },
        });
        return;
      }

      Promise.resolve()
        .then(() => invoke(...(msg.params ?? [])))
        .then(sendResponse, (err) => {
          sendResponse({
            error: String(err?.message ?? err),
            code: err?.code ?? err?.errorCode,
          });
        });
      // Keep the MV3 response channel open until the device operation settles.
      // eslint-disable-next-line consistent-return
      return true;
    }
  );
}
