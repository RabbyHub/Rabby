import 'regenerator-runtime/runtime';
import { BitBox02API, getDevicePath, constants } from 'bitbox02-api';
import { browser } from 'webextension-polyfill-ts';

async function openPopup(url) {
  await browser.windows.create({
    url,
    type: 'popup',
    width: 320,
    height: 175,
  });
}

function maybeClosePopup() {
  browser.runtime.sendMessage({ type: 'bitbox02', action: 'popup-close' });
}

export class BitBox02Keyring {
  app: null | BitBox02API;

  constructor(options?: any) {
    this.app = null;
  }

  async init() {
    const devicePath = await getDevicePath({ forceBridge: true });
    const bitbox02 = (this.app = new BitBox02API(devicePath));

    await bitbox02.connect(
      (pairingCode) => {
        openPopup(
          `vendor/bitbox02/bitbox02-pairing.html?code=${encodeURIComponent(
            pairingCode
          )}`
        );
      },
      async () => {
        maybeClosePopup();
      },
      (attestationResult) => {
        console.info(attestationResult);
      },
      () => {
        maybeClosePopup();
      },
      (status) => {
        if (status === constants.Status.PairingFailed) {
          maybeClosePopup();
        }
      }
    );

    if (bitbox02.firmware().Product() !== constants.Product.BitBox02Multi) {
      throw new Error('Unsupported device');
    }
  }

  close() {
    this.app.close();
  }

  ethGetRootPubKey(hdPath) {
    return this.app.ethGetRootPubKey(hdPath);
  }
}
