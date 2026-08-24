import browser from 'webextension-polyfill';
import BitBox02OffscreenBridge from '@/background/service/keyring/eth-bitbox02-keyring/bitbox02-offscreen-bridge';
import {
  OffscreenCommunicationEvents,
  OffscreenCommunicationTarget,
} from '@/constant/offscreen-communication';

jest.mock('hdkey', () =>
  Object.assign(jest.fn(), {
    fromExtendedKey: jest.fn((key) => ({ key })),
  })
);

jest.mock('webextension-polyfill', () => ({
  __esModule: true,
  default: {
    runtime: {
      onMessage: {
        addListener: jest.fn(),
      },
      sendMessage: jest.fn(() => Promise.resolve({ pubKey: 'xpub-live' })),
    },
    windows: {
      create: jest.fn(() => Promise.resolve()),
    },
  },
}));

describe('BitBox02OffscreenBridge', () => {
  it('opens one pairing popup no matter how many bridges exist', async () => {
    const addListener = browser.runtime.onMessage.addListener as jest.Mock;

    const bridge = new BitBox02OffscreenBridge();
    await bridge.init("m/44'/60'/0'");
    await bridge.init("m/44'/60'/0'");

    // lock/unlock, or reopening the import page, builds a brand new bridge
    const restoredBridge = new BitBox02OffscreenBridge();
    await restoredBridge.init("m/44'/60'/0'");

    // one listener for the whole service worker, registered at module load
    expect(addListener).toHaveBeenCalledTimes(1);

    const [listener] = addListener.mock.calls[0];
    listener(
      {
        target: OffscreenCommunicationTarget.extension,
        event: OffscreenCommunicationEvents.bitbox02DeviceConnect,
        payload: {
          name: 'open-popup',
          pairingCode: 'AAAAA BBBBB\nCCCCC DDDDD',
        },
      },
      {},
      jest.fn()
    );
    await Promise.resolve();

    expect(browser.windows.create).toHaveBeenCalledTimes(1);

    // the pub key rides on the init response, so it can only land on the
    // bridge that asked for it
    expect(restoredBridge.hdk).toEqual({ key: 'xpub-live' });
  });

  it('rejects init when the offscreen document is unreachable', async () => {
    (browser.runtime.sendMessage as jest.Mock).mockRejectedValueOnce(
      new Error('Could not establish connection')
    );

    await expect(
      new BitBox02OffscreenBridge().init("m/44'/60'/0'")
    ).rejects.toThrow('Could not establish connection');
  });

  it('rejects a signing request when the offscreen document errors', async () => {
    (browser.runtime.sendMessage as jest.Mock).mockResolvedValueOnce({
      error: 'user cancelled',
    });

    await expect(
      new BitBox02OffscreenBridge().ethSignMessage(1, "m/44'/60'/0'/0/0", '0x')
    ).rejects.toEqual('user cancelled');
  });

  it('rejects init when the offscreen document returns no pub key', async () => {
    (browser.runtime.sendMessage as jest.Mock).mockResolvedValueOnce({});

    await expect(
      new BitBox02OffscreenBridge().init("m/44'/60'/0'")
    ).rejects.toThrow('no pub key');
  });
});
