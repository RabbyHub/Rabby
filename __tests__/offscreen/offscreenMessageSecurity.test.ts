const mockExtensionId = 'rabby-test-extension';

const mockOneKeyBridge = {
  init: jest.fn(() => Promise.resolve()),
};
const mockBitboxBridge = {
  ethSignMessage: jest.fn(() => Promise.resolve({ success: true })),
};
const mockImKeyBridge = {
  unlock: jest.fn(() => Promise.resolve('unlocked')),
};

jest.mock('webextension-polyfill', () => ({
  __esModule: true,
  default: {
    runtime: {
      id: mockExtensionId,
      sendMessage: jest.fn(),
    },
  },
}));

jest.mock(
  '@/background/service/keyring/eth-onekey-keyring/onekey-bridge',
  () => ({
    __esModule: true,
    default: jest.fn(() => mockOneKeyBridge),
  })
);

jest.mock(
  '@/background/service/keyring/eth-bitbox02-keyring/bitbox02-bridge',
  () => ({
    __esModule: true,
    default: jest.fn(() => mockBitboxBridge),
  })
);

jest.mock(
  '@/background/service/keyring/eth-imkey-keyring/imkey-bridge',
  () => ({
    __esModule: true,
    default: jest.fn(() => mockImKeyBridge),
  })
);

jest.mock(
  '@bitboxswiss/bitbox-api',
  () => ({
    bitbox02ConnectBridge: jest.fn(),
  }),
  { virtual: true }
);

import {
  BitBox02Action,
  ImKeyAction,
  OffscreenCommunicationTarget,
  OneKeyAction,
} from '@/constant/offscreen-communication';
import { isPrivilegedOffscreenSender } from '@/utils/offscreenMessageSecurity';
import { initBitBox02 } from '@/offscreen/scripts/bitbox02';
import { initImKey } from '@/offscreen/scripts/imkey';
import initLattice from '@/offscreen/scripts/lattice';
import { initOneKey } from '@/offscreen/scripts/onekey';

type Listener = (
  message: any,
  sender: any,
  sendResponse: (response?: any) => void
) => any;

const backgroundSender = { id: mockExtensionId };
const contentScriptSender: any = {
  id: mockExtensionId,
  tab: { id: 123 },
  url: 'https://attacker.example',
};
const originalAddListener = chrome.runtime.onMessage.addListener;
const listeners: Listener[] = [];
let mockWindowOpen: jest.SpyInstance;

const cases = [
  {
    name: 'OneKey',
    register: initOneKey,
    message: {
      target: OffscreenCommunicationTarget.onekeyOffscreen,
      action: OneKeyAction.init,
      params: [],
    },
    expectRejected: () => expect(mockOneKeyBridge.init).not.toHaveBeenCalled(),
    expectAccepted: () =>
      expect(mockOneKeyBridge.init).toHaveBeenCalledTimes(1),
  },
  {
    name: 'BitBox02',
    register: initBitBox02,
    message: {
      target: OffscreenCommunicationTarget.bitbox02Offscreen,
      action: BitBox02Action.ethSignMessage,
      params: [1, "m/44'/60'/0'/0/0", '0x'],
    },
    expectRejected: () =>
      expect(mockBitboxBridge.ethSignMessage).not.toHaveBeenCalled(),
    expectAccepted: () =>
      expect(mockBitboxBridge.ethSignMessage).toHaveBeenCalledWith(
        1,
        "m/44'/60'/0'/0/0",
        '0x'
      ),
  },
  {
    name: 'imKey',
    register: initImKey,
    message: {
      target: OffscreenCommunicationTarget.imkeyOffscreen,
      action: ImKeyAction.unlock,
      params: [],
    },
    expectRejected: () => expect(mockImKeyBridge.unlock).not.toHaveBeenCalled(),
    expectAccepted: () =>
      expect(mockImKeyBridge.unlock).toHaveBeenCalledTimes(1),
  },
  {
    name: 'Lattice',
    register: initLattice,
    message: {
      target: OffscreenCommunicationTarget.latticeOffscreen,
      params: { url: 'https://lattice.gridplus.io' },
    },
    expectRejected: () => expect(mockWindowOpen).not.toHaveBeenCalled(),
    expectAccepted: async () => {
      jest.useFakeTimers();
      expect(mockWindowOpen).toHaveBeenCalledWith(
        'https://lattice.gridplus.io'
      );
      await Promise.resolve();
      jest.advanceTimersByTime(500);
    },
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  jest.useRealTimers();
  listeners.length = 0;
  chrome.runtime.id = mockExtensionId;
  chrome.runtime.onMessage.addListener = jest.fn((listener: Listener) => {
    listeners.push(listener);
  }) as any;
  mockWindowOpen = jest.spyOn(window, 'open').mockReturnValue({
    closed: false,
  } as Window);
});

afterEach(() => {
  chrome.runtime.onMessage.addListener = originalAddListener;
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('isPrivilegedOffscreenSender', () => {
  it('accepts only same-extension senders without a tab', () => {
    expect(isPrivilegedOffscreenSender(backgroundSender)).toBe(true);
    expect(
      isPrivilegedOffscreenSender({
        id: mockExtensionId,
        url: 'chrome-extension://rabby-test-extension/offscreen.html',
      })
    ).toBe(true);
    expect(isPrivilegedOffscreenSender(contentScriptSender)).toBe(false);
    expect(isPrivilegedOffscreenSender({ id: 'other-extension' })).toBe(false);
    expect(isPrivilegedOffscreenSender(undefined)).toBe(false);
  });
});

describe('offscreen hardware message boundaries', () => {
  it.each(cases)(
    '$name rejects content-script requests without side effects',
    (testCase) => {
      testCase.register();
      expect(listeners).toHaveLength(1);

      listeners[0](testCase.message, contentScriptSender, jest.fn());

      testCase.expectRejected();
    }
  );

  it.each(cases)('$name accepts background requests', async (testCase) => {
    testCase.register();
    expect(listeners).toHaveLength(1);

    listeners[0](testCase.message, backgroundSender, jest.fn());
    await Promise.resolve();
    await Promise.resolve();

    await testCase.expectAccepted();
  });
});
