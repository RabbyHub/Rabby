const mockSdk = {
  init: jest.fn(),
  cancel: jest.fn(),
  on: jest.fn(),
  uiResponse: jest.fn(),
  evmSignTransaction: jest.fn(),
  evmSignMessage: jest.fn(),
  evmSignTypedData: jest.fn(),
  searchDevices: jest.fn(),
  getDeviceState: jest.fn(),
  getPassphraseState: jest.fn(),
  evmGetPublicKey: jest.fn(),
};

jest.mock('@onekeyfe/hd-web-sdk', () => ({
  __esModule: true,
  default: { HardwareWebSdk: mockSdk },
}));
jest.mock('@onekeyfe/hd-core', () => ({
  UI_EVENT: 'UI_EVENT',
  UI_REQUEST: { REQUEST_PIN: 'PIN', REQUEST_PASSPHRASE: 'PASSPHRASE' },
  UI_RESPONSE: {
    RECEIVE_PIN: 'PIN_RESPONSE',
    RECEIVE_PASSPHRASE: 'PASSPHRASE_RESPONSE',
  },
}));

describe('OneKey SDK 1.2.7 bridge', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockSdk.init.mockResolvedValue(true);
  });

  function createBridge() {
    const Bridge = jest.requireActual(
      '@/background/service/keyring/eth-onekey-keyring/onekey-bridge'
    ).default;
    return new Bridge();
  }

  it('waits for initialization and registers one listener across bridge instances', async () => {
    const first = createBridge();
    const second = createBridge();
    await Promise.all([first.init(), second.init()]);

    expect(mockSdk.init).toHaveBeenCalledTimes(1);
    expect(mockSdk.init).toHaveBeenCalledWith(
      expect.objectContaining({
        env: 'webusb',
        fetchConfig: true,
        connectSrc: 'https://jssdk.onekey.so/1.2.7/',
      })
    );
    expect(mockSdk.on).toHaveBeenCalledTimes(1);
  });

  it('forwards device-scoped cancellation through the offscreen bridge', async () => {
    const browser = require('webextension-polyfill');
    browser.runtime.sendMessage.mockResolvedValue({ success: true });
    const Bridge = jest.requireActual(
      '@/background/service/keyring/eth-onekey-keyring/onekey-offscreen-bridge'
    ).default;
    await new Bridge().cancel('usb-path');
    expect(browser.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'onekey-cancel', params: ['usb-path'] })
    );
    browser.runtime.sendMessage.mockRejectedValueOnce(
      new Error('Offscreen closed')
    );
    await expect(new Bridge().cancel('usb-path')).rejects.toThrow(
      'Offscreen closed'
    );
  });

  it('reports failed SDK initialization and permits another attempt', async () => {
    mockSdk.init.mockResolvedValueOnce(false);
    const bridge = createBridge();
    await expect(bridge.init()).rejects.toThrow(
      'OneKey SDK initialization failed'
    );
    await expect(bridge.init()).resolves.toBeUndefined();
  });

  it('responds to V1 PIN with the exact correlation and leaves V2 PIN hints unanswered', async () => {
    await createBridge().init();
    const listener = mockSdk.on.mock.calls[0][1];
    const responseCorrelation = {
      interactionId: 'interaction',
      deviceId: 'device',
    };
    listener({ type: 'PIN', payload: { responseCorrelation } });
    expect(mockSdk.uiResponse).toHaveBeenCalledWith({
      ...responseCorrelation,
      type: 'PIN_RESPONSE',
      payload: '@@ONEKEY_INPUT_PIN_IN_DEVICE',
    });

    mockSdk.uiResponse.mockClear();
    listener({ type: 'PIN', payload: { deviceOnly: true } });
    listener({ type: 'PIN', payload: { interaction: { protocol: 'V2' } } });
    expect(mockSdk.uiResponse).not.toHaveBeenCalled();
  });

  it('preserves correlation when selecting on-device passphrase input', async () => {
    await createBridge().init();
    const responseCorrelation = {
      interactionId: 'interaction',
      deviceId: 'device',
    };
    mockSdk.on.mock.calls[0][1]({
      type: 'PASSPHRASE',
      payload: { responseCorrelation },
    });
    expect(mockSdk.uiResponse).toHaveBeenCalledWith({
      ...responseCorrelation,
      type: 'PASSPHRASE_RESPONSE',
      payload: { value: '', passphraseOnDevice: true, save: true },
    });
  });
});

jest.mock('@/utils/env', () => ({ isManifestV3: false }));
jest.mock('@/constant', () => ({ EVENTS: {} }));
jest.mock('@/eventBus', () => ({ emit: jest.fn() }));
jest.mock('webextension-polyfill', () => ({
  storage: { session: { get: jest.fn(), set: jest.fn() } },
  runtime: { sendMessage: jest.fn() },
}));
jest.mock('@/background/utils', () => ({
  isSameAddress: (first: string, second: string) =>
    first.toLowerCase() === second.toLowerCase(),
}));

describe('OneKey V1/V2 account import', () => {
  const publicKey =
    '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798';
  function setup(protocol: 'V1' | 'V2', passphraseState?: string) {
    const bridge = {
      init: jest.fn().mockResolvedValue(undefined),
      cancel: jest.fn(),
      evmSignMessage: jest.fn(),
      searchDevices: jest.fn().mockResolvedValue({
        success: true,
        payload: [{ connectId: 'usb-path', deviceId: 'legacy-projection' }],
      }),
      getDeviceState: jest.fn().mockResolvedValue({
        success: true,
        payload: {
          protocol,
          identity: { deviceId: 'authoritative-device-id' },
        },
      }),
      getPassphraseState: jest
        .fn()
        .mockResolvedValue({ success: true, payload: passphraseState }),
      evmGetPublicKey: jest.fn().mockResolvedValue({
        success: true,
        payload: { pub: publicKey, node: { chain_code: '11'.repeat(32) } },
      }),
    };
    const Keyring = jest.requireActual(
      '@/background/service/keyring/eth-onekey-keyring/eth-onekey-keyring'
    ).default;
    return { bridge, keyring: new Keyring({ bridge }) };
  }

  it.each([
    ['V1', undefined],
    ['V1', 'hidden-wallet-token'],
    ['V2', undefined],
    ['V2', 'hidden-wallet-token'],
  ] as const)(
    'imports %s with passphraseState %s using modern identity and pub fields',
    async (protocol, passphraseState) => {
      const { bridge, keyring } = setup(protocol, passphraseState);
      await expect(keyring.unlock()).resolves.toBe('just unlocked');
      expect(bridge.getDeviceState).toHaveBeenCalledWith('usb-path');
      expect(bridge.evmGetPublicKey).toHaveBeenCalledWith(
        'usb-path',
        'authoritative-device-id',
        expect.objectContaining({ passphraseState })
      );
      expect(keyring.hdk.publicKey.toString('hex')).toBe(publicKey);
    }
  );

  it('does not restore a cleared wallet cache on the next unlock', async () => {
    const env = require('@/utils/env');
    const browser = require('webextension-polyfill');
    env.isManifestV3 = true;
    browser.storage.session.get.mockResolvedValue({
      onekeySessionState: {
        deviceId: 'authoritative-device-id',
        connectId: 'usb-path',
        publicKey,
        chainCode: '11'.repeat(32),
        passphraseState: 'old-wallet',
      },
    });
    try {
      const { keyring, bridge } = setup('V2', 'new-wallet');
      await keyring.init();
      keyring.cleanUp();
      expect(keyring.isUnlocked()).toBe(false);
      await expect(keyring.unlock()).resolves.toBe('just unlocked');
      expect(bridge.getPassphraseState).toHaveBeenCalledTimes(1);
      expect(keyring.passphraseState).toBe('new-wallet');
    } finally {
      env.isManifestV3 = false;
    }
  });

  it('cancels a pending signing delay before sending a message to the device', async () => {
    jest.useFakeTimers();
    try {
      const { keyring, bridge } = setup('V2');
      keyring.unlock = jest.fn().mockResolvedValue('just unlocked');
      (keyring as any)._requestPassphraseParams = jest.fn().mockResolvedValue({
        status: 'just unlocked',
        params: {},
      });
      const signing = keyring.signPersonalMessage(
        '0x' + '11'.repeat(20),
        '0x01'
      );
      const rejected = expect(signing).rejects.toThrow(
        'OneKey signing cancelled'
      );
      await Promise.resolve();
      keyring.cancel();
      jest.runAllTimers();
      await rejected;
      expect(bridge.cancel).toHaveBeenCalled();
      expect(bridge.evmSignMessage).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it('stops before requesting wallet or public-key data when identity lookup fails', async () => {
    const { bridge, keyring } = setup('V2');
    bridge.getDeviceState.mockResolvedValue({
      success: false,
      payload: { error: 'Device disconnected', code: 100 },
    });
    await expect(keyring.unlock()).rejects.toBeTruthy();
    expect(bridge.getPassphraseState).not.toHaveBeenCalled();
    expect(bridge.evmGetPublicKey).not.toHaveBeenCalled();
  });

  it('propagates a public-key transport rejection without leaving account import pending', async () => {
    const { bridge, keyring } = setup('V2');
    bridge.evmGetPublicKey.mockRejectedValue(new Error('USB disconnected'));
    await expect(keyring.unlock()).rejects.toThrow('USB disconnected');
  });
});
