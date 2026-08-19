import browser from 'webextension-polyfill';
import BitBox02OffscreenBridge from '@/background/service/keyring/eth-bitbox02-keyring/bitbox02-offscreen-bridge';
import {
  OffscreenCommunicationEvents,
  OffscreenCommunicationTarget,
} from '@/constant/offscreen-communication';

jest.mock('hdkey', () => jest.fn());

jest.mock('webextension-polyfill', () => ({
  __esModule: true,
  default: {
    runtime: {
      onMessage: {
        addListener: jest.fn(),
      },
      sendMessage: jest.fn(() => new Promise(() => {})),
    },
    windows: {
      create: jest.fn(() => Promise.resolve()),
    },
  },
}));

describe('BitBox02OffscreenBridge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens one pairing popup after repeated initialization', async () => {
    const bridge = new BitBox02OffscreenBridge();

    void bridge.init("m/44'/60'/0'");
    void bridge.init("m/44'/60'/0'");
    void bridge.init("m/44'/60'/0'");

    const addListener = browser.runtime.onMessage.addListener as jest.Mock;
    expect(addListener).toHaveBeenCalledTimes(1);

    const event = {
      target: OffscreenCommunicationTarget.extension,
      event: OffscreenCommunicationEvents.bitbox02DeviceConnect,
      payload: {
        name: 'open-popup',
        pairingCode: 'AAAAA BBBBB\nCCCCC DDDDD',
      },
    };

    for (const [listener] of addListener.mock.calls) {
      listener(event, {}, jest.fn());
    }
    await Promise.resolve();

    expect(browser.windows.create).toHaveBeenCalledTimes(1);
  });
});
