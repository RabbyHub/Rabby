import { BitBox02BridgeInterface } from './bitbox02-bridge-interface';
import browser from 'webextension-polyfill';
import {
  OffscreenCommunicationTarget,
  OffscreenCommunicationEvents,
  BitBox02Action,
} from '@/constant/offscreen-communication';
import HDKey from 'hdkey';

async function openPopup(url: string) {
  await browser.windows.create({
    url,
    type: 'popup',
    width: 320,
    height: 175,
  });
}

function maybeClosePopup() {
  // Having no pairing window open is the normal case, and nobody answering
  // must not surface as an unhandled rejection in the service worker.
  browser.runtime
    .sendMessage({ type: 'bitbox02', action: 'popup-close' })
    .catch(() => {
      // no popup to close
    });
}

// The pairing popup is a process-wide UI side effect, not per-bridge state, so
// the listener is registered once per service worker. A per-instance guard used
// to leak one listener per bridge, and a lock/unlock cycle or a reopened import
// page builds a new bridge, so every pairing then opened N popups.
browser.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (
    msg.target !== OffscreenCommunicationTarget.extension ||
    msg.event !== OffscreenCommunicationEvents.bitbox02DeviceConnect
  ) {
    return;
  }

  const event = msg.payload;
  if (event.name === 'open-popup') {
    openPopup(
      `vendor/bitbox02/bitbox02-pairing.html?code=${encodeURIComponent(
        event.pairingCode
      )}`
    ).then(sendResponse);
  }

  if (event.name === 'close-popup') {
    maybeClosePopup();
    sendResponse();
  }

  return true;
});

export default class BitBox02OffscreenBridge
  implements BitBox02BridgeInterface {
  isDeviceConnected = false;

  hdk: HDKey = new HDKey();

  // Awaited rather than wrapped in `new Promise`: a rejected sendMessage (no
  // offscreen document, closed port) has to reject the caller instead of
  // leaving it pending forever behind the signing UI.
  private async request(action: BitBox02Action, params: any[]) {
    const res = await browser.runtime.sendMessage({
      target: OffscreenCommunicationTarget.bitbox02Offscreen,
      action,
      params,
    });

    if (res?.error) {
      throw res.error;
    }

    return res;
  }

  init: BitBox02BridgeInterface['init'] = async (hdPath) => {
    const res = await this.request(BitBox02Action.init, [hdPath]);

    if (!res?.pubKey) {
      throw new Error('BitBox02: init returned no pub key');
    }

    this.hdk = HDKey.fromExtendedKey(res.pubKey);
    this.isDeviceConnected = true;
    return res;
  };

  ethSign1559Transaction: BitBox02BridgeInterface['ethSign1559Transaction'] = async (
    ...params
  ) => {
    return this.request(BitBox02Action.ethSign1559Transaction, params);
  };

  ethSignMessage: BitBox02BridgeInterface['ethSignMessage'] = async (
    ...params
  ) => {
    return this.request(BitBox02Action.ethSignMessage, params);
  };

  ethSignTransaction: BitBox02BridgeInterface['ethSignTransaction'] = async (
    ...params
  ) => {
    return this.request(BitBox02Action.ethSignTransaction, params);
  };

  ethSignTypedMessage: BitBox02BridgeInterface['ethSignTypedMessage'] = async (
    ...params
  ) => {
    return this.request(BitBox02Action.ethSignTypedMessage, params);
  };
}
