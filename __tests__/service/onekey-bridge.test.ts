/**
 * @jest-environment node
 */
import webSdkPackage from '@onekeyfe/hd-web-sdk/package.json';
import {
  bytesToHex,
  privateToAddress,
  privateToPublic,
  toChecksumAddress,
} from '@ethereumjs/util';
import {
  SignTypedDataVersion,
  personalSign,
  signTypedData,
} from '@metamask/eth-sig-util';
import { TransactionFactory } from '@ethereumjs/tx';

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
  openWalletSession: jest.fn(),
  evmGetPublicKey: jest.fn(),
};

function getBrowserMock() {
  return jest.requireMock('webextension-polyfill') as {
    runtime: { sendMessage: jest.Mock };
    storage: { session: { get: jest.Mock; set: jest.Mock } };
  };
}

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
        connectSrc: `https://jssdk.onekey.so/${webSdkPackage.version}/`,
      })
    );
    expect(mockSdk.on).toHaveBeenCalledTimes(1);
  });

  it('forwards device-scoped cancellation through the offscreen bridge', async () => {
    getBrowserMock().runtime.sendMessage.mockResolvedValue({ success: true });
    const Bridge = jest.requireActual(
      '@/background/service/keyring/eth-onekey-keyring/onekey-offscreen-bridge'
    ).default;
    await new Bridge().cancel('usb-path');
    expect(getBrowserMock().runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'onekey-cancel', params: ['usb-path'] })
    );
    getBrowserMock().runtime.sendMessage.mockRejectedValueOnce(
      new Error('Offscreen closed')
    );
    await expect(new Bridge().cancel('usb-path')).rejects.toThrow(
      'Offscreen closed'
    );
  });

  it('rejects instead of hanging when the offscreen document is unavailable', async () => {
    getBrowserMock().runtime.sendMessage.mockRejectedValueOnce(
      new Error('Could not establish connection. Receiving end does not exist.')
    );
    const Bridge = jest.requireActual(
      '@/background/service/keyring/eth-onekey-keyring/onekey-offscreen-bridge'
    ).default;
    await expect(new Bridge().getDeviceState('usb-path')).rejects.toThrow(
      'Could not establish connection'
    );
  });

  it('rebuilds an Error with its code from an offscreen error payload', async () => {
    getBrowserMock().runtime.sendMessage.mockResolvedValueOnce({
      error: 'Device not opened passphrase',
      code: 113,
    });
    const Bridge = jest.requireActual(
      '@/background/service/keyring/eth-onekey-keyring/onekey-offscreen-bridge'
    ).default;
    const error = await new Bridge()
      .getDeviceState('usb-path')
      .catch((e: Error & { code?: number }) => e);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Device not opened passphrase');
    expect(error.code).toBe(113);
  });

  it('passes normal SDK success payloads through unchanged', async () => {
    const response = { success: true, payload: { protocol: 'V2' } };
    getBrowserMock().runtime.sendMessage.mockResolvedValueOnce(response);
    const Bridge = jest.requireActual(
      '@/background/service/keyring/eth-onekey-keyring/onekey-offscreen-bridge'
    ).default;
    await expect(new Bridge().getDeviceState('usb-path')).resolves.toBe(
      response
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

describe('OneKey offscreen error serialization', () => {
  it('keeps the message and code for Error, string and typed-error shapes', () => {
    const { serializeError } = jest.requireActual('@/offscreen/scripts/onekey');
    expect(serializeError(new Error('boom'))).toEqual({
      error: 'boom',
      code: undefined,
    });
    expect(serializeError('boom')).toEqual({
      error: 'boom',
      code: undefined,
    });
    expect(serializeError({ message: 'typed', errorCode: 400 })).toEqual({
      error: 'typed',
      code: 400,
    });
  });
});

jest.mock('@/utils/env', () => ({ isManifestV3: false }));
jest.mock('@/constant', () => ({
  EVENTS: {
    ONEKEY: { REQUEST_PERMISSION_WEBUSB: 'onekey-permission' },
    broadcastToUI: 'broadcast',
  },
}));
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
  function setup(
    protocol: 'V1' | 'V2',
    passphraseState?: string,
    status?: { passphraseProtection?: boolean },
    bridgeOverrides: Record<string, any> = {}
  ) {
    const bridge: any = {
      init: jest.fn().mockResolvedValue(undefined),
      cancel: jest.fn(),
      evmSignMessage: jest.fn(),
      evmSignTypedData: jest.fn(),
      evmSignTransaction: jest.fn(),
      searchDevices: jest.fn().mockResolvedValue({
        success: true,
        payload: [{ connectId: 'usb-path', deviceId: 'legacy-projection' }],
      }),
      getDeviceState: jest.fn().mockResolvedValue({
        success: true,
        payload: {
          protocol,
          identity: { deviceId: 'authoritative-device-id' },
          ...(status ? { status } : {}),
        },
      }),
      getPassphraseState: jest
        .fn()
        .mockImplementation(
          async (
            _connectId: string,
            params?: { useEmptyPassphrase?: boolean }
          ) => ({
            success: true,
            payload: params?.useEmptyPassphrase
              ? 'standard-wallet-id'
              : passphraseState,
          })
        ),
      evmGetPublicKey: jest.fn().mockResolvedValue({
        success: true,
        payload: { pub: publicKey, node: { chain_code: '11'.repeat(32) } },
      }),
      ...bridgeOverrides,
    };
    const Keyring = jest.requireActual(
      '@/background/service/keyring/eth-onekey-keyring/eth-onekey-keyring'
    ).default;
    return { bridge, keyring: new Keyring({ bridge }) };
  }

  const privateKey = Buffer.from('11'.repeat(32), 'hex');
  const otherPrivateKey = Buffer.from('22'.repeat(32), 'hex');
  const signerAddress = toChecksumAddress(
    bytesToHex(privateToAddress(privateKey))
  );
  const signerPublicKey = bytesToHex(privateToPublic(privateKey)).slice(2);
  const message = '0x48656c6c6f';

  const typedData = {
    types: {
      EIP712Domain: [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' },
      ],
      Mail: [{ name: 'contents', type: 'string' }],
    },
    primaryType: 'Mail',
    domain: {
      name: 'Ether Mail',
      version: '1',
      chainId: 1,
      verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC',
    },
    message: { contents: 'Hello, Bob!' },
  };

  function signingKeyring(
    passphraseState: string | undefined = 'stale-wallet-token',
    bridgeOverrides: Record<string, any> = {}
  ) {
    const { bridge, keyring } = setup(
      'V2',
      undefined,
      undefined,
      bridgeOverrides
    );
    keyring.accounts = [signerAddress];
    keyring.accountDetails[signerAddress] = {
      version: 2,
      hdPath: "m/44'/60'/0'/0/0",
      hdPathType: 'BIP44',
      passphraseState,
      index: 0,
    };
    keyring.passphraseState = passphraseState;
    keyring.connectId = 'usb-path';
    keyring.deviceId = 'authoritative-device-id';
    keyring.hdk.publicKey = Buffer.from(publicKey, 'hex');
    return { bridge, keyring };
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

  it('shares concurrent unlock and address imports without issuing competing SDK calls', async () => {
    const { bridge, keyring } = setup('V2');
    await Promise.all([
      keyring.unlock(),
      keyring.getAddresses(0, 1),
      keyring.getAddresses(1, 2),
    ]);
    expect(bridge.searchDevices).toHaveBeenCalledTimes(1);
    expect(bridge.getDeviceState).toHaveBeenCalledTimes(1);
    expect(bridge.getPassphraseState).toHaveBeenCalledTimes(1);
    expect(bridge.evmGetPublicKey).toHaveBeenCalledTimes(1);
  });

  it.each(['getDeviceState', 'getPassphraseState', 'evmGetPublicKey'])(
    'cancels import during %s and ignores a late successful device response',
    async (stage) => {
      const { bridge, keyring } = setup('V2');
      const response = await bridge[stage]();
      bridge[stage].mockClear();
      let finish!: (value: any) => void;
      let entered!: () => void;
      const waiting = new Promise<void>((resolve) => {
        entered = resolve;
      });
      bridge[stage].mockImplementationOnce(() => {
        entered();
        return new Promise((resolve) => {
          finish = resolve;
        });
      });
      const importing = keyring.getAddresses(0, 1);
      const rejected = expect(importing).rejects.toThrow(
        'OneKey signing cancelled'
      );
      await waiting;
      await keyring.cleanUp(true);
      expect(bridge.cancel).toHaveBeenCalledWith('usb-path');
      finish(response);
      await rejected;
      expect(keyring.isUnlocked()).toBe(false);
      if (stage === 'getDeviceState')
        expect(bridge.getPassphraseState).not.toHaveBeenCalled();
      if (stage !== 'evmGetPublicKey')
        expect(bridge.evmGetPublicKey).not.toHaveBeenCalled();
      await expect(keyring.unlock()).resolves.toBe('just unlocked');
    }
  );

  it('does not cancel another device operation when a completed import page closes', async () => {
    const { bridge, keyring } = setup('V2');
    await keyring.unlock();
    await keyring.cleanUp(true);
    expect(bridge.cancel).not.toHaveBeenCalled();
    expect(keyring.isUnlocked()).toBe(false);
  });

  it('releases a pending Mini signing request when its UI cleans up', async () => {
    const { bridge, keyring } = signingKeyring();
    let finish!: (value: any) => void;
    let entered!: () => void;
    const waiting = new Promise<void>((resolve) => {
      entered = resolve;
    });
    bridge.evmSignMessage.mockImplementationOnce(() => {
      entered();
      return new Promise((resolve) => {
        finish = resolve;
      });
    });
    const signing = keyring.signPersonalMessage(signerAddress, message);
    const rejected = expect(signing).rejects.toThrow(
      'OneKey signing cancelled'
    );
    await waiting;
    await keyring.cleanUp(true);
    expect(bridge.cancel).toHaveBeenCalledWith('usb-path');
    finish({ success: true, payload: { signature: 'late-signature' } });
    await rejected;
  });

  it('clears a failed unlock so a reconnect can retry', async () => {
    const { bridge, keyring } = setup('V2');
    bridge.searchDevices.mockRejectedValueOnce(
      Object.assign(new Error('Disconnected'), { code: 107 })
    );
    await expect(keyring.unlock()).rejects.toMatchObject({ code: 107 });
    await expect(keyring.unlock()).resolves.toBe('just unlocked');
  });

  it.each([
    105,
    901,
    802,
    801,
    803,
    822,
    117,
    107,
    109,
    407,
    414,
    115,
    116,
    112,
    113,
    118,
  ])('preserves SDK error code %s through an unlock failure', async (code) => {
    const { bridge, keyring } = setup('V2');
    bridge.getDeviceState.mockResolvedValueOnce({
      success: false,
      payload: { code, error: 'SDK failure' },
    });
    await expect(keyring.unlock()).rejects.toMatchObject({ code });
  });

  it.each(['transaction', 'personal', 'typed'])(
    'preserves a thrown SDK error code during %s signing',
    async (kind) => {
      const { bridge, keyring } = signingKeyring();
      const error = Object.assign(new Error('USB interrupted'), { code: 109 });
      bridge.evmSignTransaction.mockRejectedValueOnce(error);
      bridge.evmSignMessage.mockRejectedValueOnce(error);
      bridge.evmSignTypedData.mockRejectedValueOnce(error);
      const signing =
        kind === 'transaction'
          ? keyring.signTransaction(
              signerAddress,
              TransactionFactory.fromTxData({ gasLimit: 21000, gasPrice: 1 })
            )
          : kind === 'personal'
          ? keyring.signPersonalMessage(signerAddress, message)
          : keyring.signTypedData(signerAddress, typedData, { version: 'V4' });
      await expect(signing).rejects.toMatchObject({
        code: 109,
        message: 'USB interrupted',
      });
    }
  );

  it.each(['transaction', 'personal', 'typed'])(
    'preserves a returned SDK error code during %s signing',
    async (kind) => {
      const { bridge, keyring } = signingKeyring();
      const response = {
        success: false,
        payload: { code: 802, error: 'PIN cancelled' },
      };
      bridge.evmSignTransaction.mockResolvedValueOnce(response);
      bridge.evmSignMessage.mockResolvedValueOnce(response);
      bridge.evmSignTypedData.mockResolvedValueOnce(response);
      const signing =
        kind === 'transaction'
          ? keyring.signTransaction(
              signerAddress,
              TransactionFactory.fromTxData({ gasLimit: 21000, gasPrice: 1 })
            )
          : kind === 'personal'
          ? keyring.signPersonalMessage(signerAddress, message)
          : keyring.signTypedData(signerAddress, typedData, { version: 'V4' });
      await expect(signing).rejects.toMatchObject({ code: 802 });
    }
  );

  it('selects the standard wallet on a V2 device with passphrase protection off', async () => {
    // Real Pro 2 firmware returns the standard-wallet session id
    // (btc_test_address) even when passphrase protection is off.
    const { bridge, keyring } = setup('V2', 'bc1q-standard-wallet-session', {
      passphraseProtection: false,
    });
    await expect(keyring.unlock()).resolves.toBe('just unlocked');
    expect(bridge.getPassphraseState).toHaveBeenCalledTimes(1);
    expect(bridge.getPassphraseState).toHaveBeenCalledWith('usb-path', {
      useEmptyPassphrase: true,
    });
    expect(bridge.evmGetPublicKey).toHaveBeenCalledWith(
      'usb-path',
      'authoritative-device-id',
      expect.objectContaining({
        passphraseState: undefined,
        useEmptyPassphrase: true,
      })
    );
    expect(keyring.passphraseState).toBeUndefined();
  });

  it.each([
    [{ error: 'Passphrase disabled', code: 999 }],
    [{ error: 'Device not opened passphrase', code: 113 }],
  ])(
    'retries with the standard wallet when wallet selection fails with %p',
    async (failure) => {
      const { bridge, keyring } = setup('V2', 'bc1q-standard-wallet-session');
      bridge.getPassphraseState
        .mockResolvedValueOnce({ success: false, payload: failure })
        .mockResolvedValueOnce({
          success: true,
          payload: 'bc1q-standard-wallet-session',
        });
      await expect(keyring.unlock()).resolves.toBe('just unlocked');
      expect(bridge.getPassphraseState).toHaveBeenNthCalledWith(
        1,
        'usb-path',
        undefined
      );
      expect(bridge.getPassphraseState).toHaveBeenNthCalledWith(2, 'usb-path', {
        useEmptyPassphrase: true,
      });
      expect(bridge.evmGetPublicKey).toHaveBeenCalledWith(
        'usb-path',
        'authoritative-device-id',
        expect.objectContaining({
          passphraseState: undefined,
          useEmptyPassphrase: true,
        })
      );
    }
  );

  it('keeps the hidden wallet passphraseState on a V2 device with passphrase on', async () => {
    const { bridge, keyring } = setup('V2', 'hidden-wallet-token', {
      passphraseProtection: true,
    });
    await expect(keyring.unlock()).resolves.toBe('just unlocked');
    expect(bridge.getPassphraseState).toHaveBeenCalledWith(
      'usb-path',
      undefined
    );
    expect(bridge.evmGetPublicKey).toHaveBeenCalledWith(
      'usb-path',
      'authoritative-device-id',
      expect.objectContaining({
        passphraseState: 'hidden-wallet-token',
        useEmptyPassphrase: false,
      })
    );
    expect(keyring.passphraseState).toBe('hidden-wallet-token');
  });

  it('stores no passphraseState when openWalletSession selects the standard wallet', async () => {
    const openWalletSession = jest.fn().mockResolvedValue({
      success: true,
      payload: {
        protocol: 'V2',
        deviceId: 'authoritative-device-id',
        resumed: false,
        walletType: 'standard',
        passphraseState: null,
      },
    });
    const { bridge, keyring } = setup(
      'V2',
      'ignored-wallet-id',
      { passphraseProtection: true },
      { openWalletSession }
    );
    await expect(keyring.unlock()).resolves.toBe('just unlocked');
    expect(openWalletSession).toHaveBeenCalledTimes(1);
    expect(openWalletSession).toHaveBeenCalledWith('usb-path', {
      mode: 'select-hidden',
    });
    expect(bridge.getPassphraseState).not.toHaveBeenCalled();
    expect(keyring.passphraseState).toBeUndefined();
    expect(bridge.evmGetPublicKey).toHaveBeenCalledWith(
      'usb-path',
      'authoritative-device-id',
      expect.objectContaining({
        passphraseState: undefined,
        useEmptyPassphrase: true,
      })
    );
  });

  it('stores the hidden wallet passphraseState from openWalletSession', async () => {
    const openWalletSession = jest.fn().mockResolvedValue({
      success: true,
      payload: {
        protocol: 'V2',
        deviceId: 'authoritative-device-id',
        resumed: false,
        walletType: 'hidden',
        passphraseState: 'hidden-wallet-token',
      },
    });
    const { bridge, keyring } = setup(
      'V2',
      undefined,
      { passphraseProtection: true },
      { openWalletSession }
    );
    await expect(keyring.unlock()).resolves.toBe('just unlocked');
    expect(openWalletSession).toHaveBeenCalledWith('usb-path', {
      mode: 'select-hidden',
    });
    expect(bridge.getPassphraseState).toHaveBeenCalledWith('usb-path', {
      useEmptyPassphrase: true,
    });
    expect(keyring.passphraseState).toBe('hidden-wallet-token');
    expect(bridge.evmGetPublicKey).toHaveBeenCalledWith(
      'usb-path',
      'authoritative-device-id',
      expect.objectContaining({
        passphraseState: 'hidden-wallet-token',
        useEmptyPassphrase: false,
      })
    );
  });

  it('treats an empty passphrase in select-hidden as the standard wallet', async () => {
    const openWalletSession = jest.fn().mockResolvedValue({
      success: true,
      payload: {
        protocol: 'V2',
        deviceId: 'authoritative-device-id',
        resumed: false,
        walletType: 'hidden',
        passphraseState: 'standard-wallet-id',
      },
    });
    const { bridge, keyring } = setup(
      'V2',
      'standard-wallet-id',
      { passphraseProtection: true },
      { openWalletSession }
    );
    await expect(keyring.unlock()).resolves.toBe('just unlocked');
    expect(openWalletSession).toHaveBeenCalledWith('usb-path', {
      mode: 'select-hidden',
    });
    expect(bridge.getPassphraseState).toHaveBeenCalledWith('usb-path', {
      useEmptyPassphrase: true,
    });
    expect(keyring.passphraseState).toBeUndefined();
    expect(bridge.evmGetPublicKey).toHaveBeenCalledWith(
      'usb-path',
      'authoritative-device-id',
      expect.objectContaining({
        passphraseState: undefined,
        useEmptyPassphrase: true,
      })
    );
  });

  it('keeps a real hidden wallet whose passphraseState differs from the standard identity', async () => {
    const openWalletSession = jest.fn().mockResolvedValue({
      success: true,
      payload: {
        protocol: 'V2',
        deviceId: 'authoritative-device-id',
        resumed: false,
        walletType: 'hidden',
        passphraseState: 'hidden-wallet-token',
      },
    });
    const { bridge, keyring } = setup(
      'V2',
      'hidden-wallet-token',
      { passphraseProtection: true },
      { openWalletSession }
    );
    await expect(keyring.unlock()).resolves.toBe('just unlocked');
    expect(bridge.getPassphraseState).toHaveBeenCalledWith('usb-path', {
      useEmptyPassphrase: true,
    });
    expect(keyring.passphraseState).toBe('hidden-wallet-token');
    expect(bridge.evmGetPublicKey).toHaveBeenCalledWith(
      'usb-path',
      'authoritative-device-id',
      expect.objectContaining({
        passphraseState: 'hidden-wallet-token',
        useEmptyPassphrase: false,
      })
    );
  });

  it('keeps the hidden wallet when the standard-identity probe fails', async () => {
    const openWalletSession = jest.fn().mockResolvedValue({
      success: true,
      payload: {
        protocol: 'V2',
        deviceId: 'authoritative-device-id',
        resumed: false,
        walletType: 'hidden',
        passphraseState: 'hidden-wallet-token',
      },
    });
    const { bridge, keyring } = setup(
      'V2',
      'hidden-wallet-token',
      { passphraseProtection: true },
      { openWalletSession }
    );
    bridge.getPassphraseState.mockRejectedValueOnce(new Error('probe failed'));
    await expect(keyring.unlock()).resolves.toBe('just unlocked');
    expect(keyring.passphraseState).toBe('hidden-wallet-token');
  });

  it('retries openWalletSession in standard mode when hidden selection is disabled', async () => {
    const openWalletSession = jest
      .fn()
      .mockResolvedValueOnce({
        success: false,
        payload: { code: 113, error: 'Passphrase disabled' },
      })
      .mockResolvedValueOnce({
        success: true,
        payload: {
          protocol: 'V2',
          deviceId: 'authoritative-device-id',
          resumed: false,
          walletType: 'standard',
          passphraseState: null,
        },
      });
    const { keyring } = setup(
      'V2',
      undefined,
      { passphraseProtection: true },
      { openWalletSession }
    );
    await expect(keyring.unlock()).resolves.toBe('just unlocked');
    expect(openWalletSession).toHaveBeenNthCalledWith(1, 'usb-path', {
      mode: 'select-hidden',
    });
    expect(openWalletSession).toHaveBeenNthCalledWith(2, 'usb-path', {
      mode: 'standard',
    });
    expect(keyring.passphraseState).toBeUndefined();
  });

  it('keeps using getPassphraseState on V1 even when openWalletSession exists', async () => {
    const openWalletSession = jest.fn();
    const { bridge, keyring } = setup('V1', 'v1-wallet-token', undefined, {
      openWalletSession,
    });
    await expect(keyring.unlock()).resolves.toBe('just unlocked');
    expect(openWalletSession).not.toHaveBeenCalled();
    expect(bridge.getPassphraseState).toHaveBeenCalledWith(
      'usb-path',
      undefined
    );
    expect(keyring.passphraseState).toBe('v1-wallet-token');
  });

  it.each([
    { error: 'OneKey action not supported' },
    { code: 'MethodNotAllowed', error: 'Unavailable API' },
    { code: -32601, error: 'Unavailable API' },
    { error: 'Method not found' },
  ])(
    'falls back to getPassphraseState when openWalletSession returns %p',
    async (payload) => {
      const openWalletSession = jest.fn().mockResolvedValue({
        success: false,
        payload,
      });
      const { bridge, keyring } = setup(
        'V2',
        'legacy-wallet-token',
        { passphraseProtection: true },
        { openWalletSession }
      );
      await expect(keyring.unlock()).resolves.toBe('just unlocked');
      expect(openWalletSession).toHaveBeenCalledTimes(1);
      expect(bridge.getPassphraseState).toHaveBeenCalledWith(
        'usb-path',
        undefined
      );
      expect(keyring.passphraseState).toBe('legacy-wallet-token');
    }
  );

  it('falls back to the standard wallet when the relay throws method not found', async () => {
    const { bridge, keyring } = setup(
      'V2',
      'standard-wallet-id',
      { passphraseProtection: false },
      {
        openWalletSession: jest
          .fn()
          .mockRejectedValue(new Error('Method not found')),
      }
    );
    await expect(keyring.unlock()).resolves.toBe('just unlocked');
    expect(bridge.getPassphraseState).toHaveBeenCalledWith('usb-path', {
      useEmptyPassphrase: true,
    });
    expect(keyring.passphraseState).toBeUndefined();
  });

  it('does not fall back for an unrelated openWalletSession failure', async () => {
    const { bridge, keyring } = setup('V2', undefined, undefined, {
      openWalletSession: jest.fn().mockResolvedValue({
        success: false,
        payload: { code: 800, error: 'Device disconnected' },
      }),
    });
    await expect(keyring.unlock()).rejects.toThrow('800: Device disconnected');
    expect(bridge.getPassphraseState).not.toHaveBeenCalled();
    expect(bridge.evmGetPublicKey).not.toHaveBeenCalled();
  });

  it('rejects unlock failures with an Error that carries the device message', async () => {
    const { bridge, keyring } = setup('V2');
    bridge.getPassphraseState.mockResolvedValue({
      success: false,
      payload: { error: 'Some wallet session failure', code: 800 },
    });
    const error = await keyring.unlock().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(Error);
    expect(error).toMatchObject({
      code: 800,
      message: '800: Some wallet session failure',
    });
    expect(bridge.evmGetPublicKey).not.toHaveBeenCalled();
  });

  it('does not restore a cleared wallet cache on the next unlock', async () => {
    const env = jest.requireMock('@/utils/env') as { isManifestV3: boolean };
    env.isManifestV3 = true;
    getBrowserMock().storage.session.get.mockResolvedValue({
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
      expect(bridge.getPassphraseState).toHaveBeenNthCalledWith(
        1,
        'usb-path',
        undefined
      );
      expect(bridge.getPassphraseState).toHaveBeenNthCalledWith(2, 'usb-path', {
        useEmptyPassphrase: true,
      });
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

  it('retries signing once with an empty passphrase when the standard wallet owns the account', async () => {
    const signature = personalSign({ privateKey, data: message });
    const { bridge, keyring } = signingKeyring();
    bridge.evmSignMessage
      .mockResolvedValueOnce({
        success: false,
        payload: { code: 113, error: 'Passphrase disabled' },
      })
      .mockResolvedValueOnce({
        success: true,
        payload: {
          address: signerAddress,
          signature: signature.slice(2),
        },
      });
    bridge.evmGetPublicKey.mockResolvedValueOnce({
      success: true,
      payload: { pub: signerPublicKey },
    });

    await expect(
      keyring.signPersonalMessage(signerAddress, message)
    ).resolves.toBe(signature);
    expect(bridge.evmGetPublicKey).toHaveBeenCalledWith(
      'usb-path',
      'authoritative-device-id',
      expect.objectContaining({
        path: "m/44'/60'/0'/0/0",
        showOnOneKey: false,
        chainId: 1,
        useEmptyPassphrase: true,
      })
    );
    expect(bridge.evmSignMessage).toHaveBeenCalledTimes(2);
    expect(bridge.evmSignMessage.mock.calls[0][2]).toEqual(
      expect.objectContaining({
        passphraseState: 'stale-wallet-token',
        useEmptyPassphrase: false,
      })
    );
    expect(bridge.evmSignMessage.mock.calls[1][2]).toEqual(
      expect.objectContaining({
        passphraseState: undefined,
        useEmptyPassphrase: true,
      })
    );
    expect(
      keyring.accountDetails[signerAddress].passphraseState
    ).toBeUndefined();
    expect(keyring.passphraseState).toBeUndefined();
  });

  it('keeps the original 113 error when the standard wallet does not own the account', async () => {
    const { bridge, keyring } = signingKeyring();
    bridge.evmSignMessage.mockResolvedValueOnce({
      success: false,
      payload: { code: 113, error: 'Passphrase disabled' },
    });
    bridge.evmGetPublicKey.mockResolvedValueOnce({
      success: true,
      payload: {
        pub: bytesToHex(privateToPublic(otherPrivateKey)).slice(2),
      },
    });

    const error = await keyring
      .signPersonalMessage(signerAddress, message)
      .catch((e: Error) => e);
    expect(error.message).toBe('113: Passphrase disabled');
    expect(bridge.evmSignMessage).toHaveBeenCalledTimes(1);
    expect(keyring.accountDetails[signerAddress].passphraseState).toBe(
      'stale-wallet-token'
    );
    expect(keyring.passphraseState).toBe('stale-wallet-token');
  });

  it.each(['transaction', 'V3', 'V4'] as const)(
    'recovers stale passphrase state for %s signing with the same signing parameters',
    async (kind) => {
      const { bridge, keyring } = signingKeyring();
      const tx = TransactionFactory.fromTxData({
        gasLimit: 21000,
        gasPrice: 1,
        to: signerAddress,
      });
      const signedTx = tx.sign(privateKey);
      const signature =
        kind === 'transaction'
          ? undefined
          : signTypedData({
              privateKey,
              data: typedData as any,
              version:
                kind === 'V4'
                  ? SignTypedDataVersion.V4
                  : SignTypedDataVersion.V3,
            });
      const sign =
        kind === 'transaction'
          ? bridge.evmSignTransaction
          : bridge.evmSignTypedData;
      sign
        .mockResolvedValueOnce({
          success: false,
          payload: { code: 113, error: 'Passphrase disabled' },
        })
        .mockResolvedValueOnce({
          success: true,
          payload:
            kind === 'transaction'
              ? {
                  v: signedTx.v!.toString(16),
                  r: signedTx.r!.toString(16),
                  s: signedTx.s!.toString(16),
                }
              : {
                  address: signerAddress.toLowerCase(),
                  signature: signature!.slice(2),
                },
        });
      bridge.evmGetPublicKey.mockResolvedValueOnce({
        success: true,
        payload: { pub: signerPublicKey },
      });
      const result =
        kind === 'transaction'
          ? await keyring.signTransaction(signerAddress, tx)
          : await keyring.signTypedData(signerAddress, typedData, {
              version: kind,
            });
      if (kind === 'transaction') {
        expect(result.getSenderAddress().toString()).toBe(
          signerAddress.toLowerCase()
        );
      } else {
        expect(result).toBe(signature);
      }
      expect(sign).toHaveBeenCalledTimes(2);
      expect(sign.mock.calls[1][2]).toEqual({
        ...sign.mock.calls[0][2],
        passphraseState: undefined,
        useEmptyPassphrase: true,
      });
      expect(bridge.evmGetPublicKey.mock.calls[0][2].path).toBe(
        sign.mock.calls[0][2].path
      );
    }
  );

  it('does not retry a second time when signing still returns 113', async () => {
    const { bridge, keyring } = signingKeyring();
    bridge.evmSignMessage.mockResolvedValue({
      success: false,
      payload: { code: 113, error: 'Passphrase disabled' },
    });
    bridge.evmGetPublicKey.mockResolvedValueOnce({
      success: true,
      payload: { pub: signerPublicKey },
    });
    await expect(
      keyring.signPersonalMessage(signerAddress, message)
    ).rejects.toThrow('113: Passphrase disabled');
    expect(bridge.evmSignMessage).toHaveBeenCalledTimes(2);
    expect(bridge.evmGetPublicKey).toHaveBeenCalledTimes(1);
  });

  it.each(['signing', 'address-check'])(
    'does not retry after cancellation during %s',
    async (stage) => {
      const { bridge, keyring } = signingKeyring();
      bridge.evmSignMessage.mockImplementationOnce(async () => {
        if (stage === 'signing') await keyring.cancel();
        return {
          success: false,
          payload: { code: 113, error: 'Passphrase disabled' },
        };
      });
      bridge.evmGetPublicKey.mockImplementationOnce(async () => {
        await keyring.cancel();
        return { success: true, payload: { pub: signerPublicKey } };
      });
      await expect(
        keyring.signPersonalMessage(signerAddress, message)
      ).rejects.toThrow('OneKey signing cancelled');
      expect(bridge.evmSignMessage).toHaveBeenCalledTimes(1);
      expect(bridge.evmGetPublicKey).toHaveBeenCalledTimes(
        stage === 'signing' ? 0 : 1
      );
      expect(keyring.accountDetails[signerAddress].passphraseState).toBe(
        'stale-wallet-token'
      );
    }
  );

  it('clears recovered passphrase state in the MV3 session', async () => {
    const env = jest.requireMock('@/utils/env') as { isManifestV3: boolean };
    env.isManifestV3 = true;
    const state = {
      passphraseState: 'stale-wallet-token',
      deviceId: 'authoritative-device-id',
      connectId: 'usb-path',
      publicKey,
      chainCode: '11'.repeat(32),
    };
    getBrowserMock().storage.session.get.mockResolvedValue({
      onekeySessionState: state,
    });
    try {
      const { bridge, keyring } = signingKeyring();
      const signature = personalSign({ privateKey, data: message });
      bridge.evmSignMessage
        .mockResolvedValueOnce({
          success: false,
          payload: { code: 113, error: 'Passphrase disabled' },
        })
        .mockResolvedValueOnce({
          success: true,
          payload: { signature: signature.slice(2) },
        });
      bridge.evmGetPublicKey.mockResolvedValueOnce({
        success: true,
        payload: { pub: signerPublicKey },
      });
      await expect(
        keyring.signPersonalMessage(signerAddress, message)
      ).resolves.toBe(signature);
      expect(getBrowserMock().storage.session.set).toHaveBeenCalledWith({
        onekeySessionState: { ...state, passphraseState: undefined },
      });
    } finally {
      env.isManifestV3 = false;
    }
  });

  it('accepts a lowercase hardware address by recovering the personal-sign signer', async () => {
    const signature = personalSign({ privateKey, data: message });
    const { bridge, keyring } = signingKeyring(undefined);
    bridge.evmSignMessage.mockResolvedValueOnce({
      success: true,
      payload: {
        address: signerAddress.toLowerCase(),
        signature: signature.slice(2),
      },
    });

    await expect(
      keyring.signPersonalMessage(signerAddress, message)
    ).resolves.toBe(signature);
    expect(keyring.isUnlocked()).toBe(true);
  });

  it('rejects a personal signature from a different signer instead of resolving it', async () => {
    const wrongSignature = personalSign({
      privateKey: otherPrivateKey,
      data: message,
    });
    const { bridge, keyring } = signingKeyring(undefined);
    bridge.evmSignMessage.mockResolvedValueOnce({
      success: true,
      payload: {
        address: signerAddress,
        signature: wrongSignature.slice(2),
      },
    });

    await expect(
      keyring.signPersonalMessage(signerAddress, message)
    ).rejects.toThrow('signature doesnt match the right address');
    expect(keyring.isUnlocked()).toBe(false);
  });

  it.each([SignTypedDataVersion.V3, SignTypedDataVersion.V4])(
    'recovers the %s typed-data signer and rejects a mismatched signature',
    async (version) => {
      const signature = signTypedData({
        privateKey,
        data: typedData as any,
        version,
      });
      const wrongSignature = signTypedData({
        privateKey: otherPrivateKey,
        data: typedData as any,
        version,
      });
      const { bridge, keyring } = signingKeyring(undefined);
      bridge.evmSignTypedData
        .mockResolvedValueOnce({
          success: true,
          payload: {
            address: signerAddress.toLowerCase(),
            signature: signature.slice(2),
          },
        })
        .mockResolvedValueOnce({
          success: true,
          payload: {
            address: signerAddress,
            signature: wrongSignature.slice(2),
          },
        });

      await expect(
        keyring.signTypedData(signerAddress, typedData, { version })
      ).resolves.toBe(signature);
      await expect(
        keyring.signTypedData(signerAddress, typedData, { version })
      ).rejects.toThrow('signature doesnt match the right address');
    }
  );
});

describe('OneKey WebUSB discovery', () => {
  const originalNavigator = Object.getOwnPropertyDescriptor(
    globalThis,
    'navigator'
  );
  afterEach(() => {
    if (originalNavigator)
      Object.defineProperty(globalThis, 'navigator', originalNavigator);
    else Reflect.deleteProperty(globalThis, 'navigator');
  });
  function setUSB(usb: any) {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { usb },
    });
    return jest.requireActual(
      '@/ui/utils/onekey'
    ) as typeof import('@/ui/utils/onekey');
  }
  const device = {
    vendorId: 0x1209,
    productId: 0x4f4c,
    manufacturerName: 'OneKey',
  };

  it('matches vendor and product and excludes known Trezor devices sharing OneKey USB ids', async () => {
    const utils = setUSB({
      getDevices: jest
        .fn()
        .mockResolvedValue([
          { ...device, productId: 0xffff },
          { ...device, vendorId: 0xffff },
          { ...device, productId: 0x53c1, manufacturerName: ' Trezor ' },
          { ...device, productId: 0x53c1, manufacturerName: 'SatoshiLabs' },
          device,
        ]),
    });
    await expect(utils.getOneKeyDevices()).resolves.toEqual([device]);
  });

  it('handles missing WebUSB without dereferencing an undefined device list', async () => {
    const utils = setUSB(undefined);
    await expect(utils.getOneKeyDevices()).resolves.toEqual([]);
    await expect(utils.getOneKeyFirstOneKeyDevice()).rejects.toBeInstanceOf(
      Error
    );
  });

  it('reuses a granted device and requests a new device after unplugging', async () => {
    const usb = {
      getDevices: jest
        .fn()
        .mockResolvedValueOnce([device])
        .mockResolvedValueOnce([]),
      requestDevice: jest.fn().mockResolvedValue(device),
    };
    const utils = setUSB(usb);
    await expect(utils.getOneKeyFirstOneKeyDevice()).resolves.toBe(device);
    expect(usb.requestDevice).not.toHaveBeenCalled();
    await expect(utils.getOneKeyFirstOneKeyDevice()).resolves.toBe(device);
    expect(usb.requestDevice).toHaveBeenCalledWith({
      filters: expect.arrayContaining([
        expect.objectContaining({ vendorId: 0x1209, productId: 0x4f4c }),
      ]),
    });
  });

  it('rejects a known Trezor selected in the shared-id chooser', async () => {
    const utils = setUSB({
      getDevices: jest.fn().mockResolvedValue([]),
      requestDevice: jest.fn().mockResolvedValue({
        ...device,
        productId: 0x53c1,
        manufacturerName: 'Trezor',
      }),
    });
    await expect(utils.getOneKeyFirstOneKeyDevice()).rejects.toBeInstanceOf(
      Error
    );
  });

  it('preserves NotFoundError so callers can silently handle chooser cancellation', async () => {
    const cancelled = Object.assign(new Error('No device selected'), {
      name: 'NotFoundError',
    });
    const utils = setUSB({
      getDevices: jest.fn().mockResolvedValue([]),
      requestDevice: jest.fn().mockRejectedValue(cancelled),
    });
    await expect(utils.getOneKeyFirstOneKeyDevice()).rejects.toBe(cancelled);
  });
});
