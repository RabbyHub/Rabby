import TrezorConnect from '@trezor/connect-webextension';

import TrezorBridge from '@/background/service/keyring/eth-trezor-keyring/trezor-bridge';

jest.mock('@trezor/connect-webextension', () => ({
  __esModule: true,
  default: {
    init: jest.fn(),
    ethereumGetPublicKey: jest.fn(),
    ethereumSignTransaction: jest.fn(),
    ethereumSignMessage: jest.fn(),
    ethereumSignTypedData: jest.fn(),
  },
}));

// The bridge imports both packages and picks one at runtime. Mock the other
// one so Jest never has to parse the ESM-only dependency.
jest.mock('@trezor/connect-web', () => ({
  __esModule: true,
  default: {
    init: jest.fn(),
  },
}));

const connect = TrezorConnect as jest.Mocked<typeof TrezorConnect>;

const manifest = {
  email: 'support@rabby.io',
  appName: 'Rabby Wallet',
  appUrl: 'https://rabby.io/',
};

const expectedManifest = {
  ...manifest,
  appIcon:
    'https://static-assets.rabby.io/files/122da969-da58-42e9-ab39-0a8dd38d94b8.png',
};

describe('Trezor Connect bridge', () => {
  it('retries failed initialization, shares concurrent initialization and preserves responses', async () => {
    const bridge = new TrezorBridge();
    const anotherBridge = new TrezorBridge();
    connect.init.mockRejectedValueOnce(new Error('init failed'));

    await bridge.init({ manifest });
    expect(connect.init).not.toHaveBeenCalled();
    await expect(bridge.ethereumSignMessage({ path: 'm/1' })).rejects.toThrow(
      'init failed'
    );

    let finishInit: () => void = () => {};
    connect.init.mockImplementationOnce(
      () => new Promise<void>((resolve) => (finishInit = resolve))
    );
    const response = {
      success: false,
      error: { code: 'rejected', message: 'No' },
    };
    connect.ethereumGetPublicKey.mockResolvedValueOnce(response as never);
    connect.ethereumSignMessage.mockResolvedValueOnce(response as never);

    const publicKey = bridge.getPublicKey({
      bundle: [{ path: "m/44'/60'/0'", coin: 'ETH' }],
    });
    const signature = anotherBridge.ethereumSignMessage({ path: 'm/1' });
    expect(connect.init).toHaveBeenCalledTimes(2);
    finishInit();
    expect(await publicKey).toBe(response);
    expect(await signature).toBe(response);
    expect(connect.ethereumGetPublicKey).toHaveBeenCalledWith({
      bundle: [{ path: "m/44'/60'/0'" }],
    });
    expect(connect.init).toHaveBeenLastCalledWith({
      manifest: expectedManifest,
      env: 'webextension',
    });
    expect(bridge.getSigningDiagnostics().transport).toBe('unknown');
  });

  it('invalidates the keyring cache when the active device changes', async () => {
    const bridge = new TrezorBridge();
    await bridge.init({ manifest });
    const cleanUp = jest.fn();
    bridge.event.on('cleanUp', cleanUp);

    connect.ethereumSignMessage.mockResolvedValueOnce({
      success: true,
      payload: { address: '0x0', signature: '0x0' },
      device: { path: 'device-a', state: { staticSessionId: 'session-a' } },
    } as never);
    await bridge.ethereumSignMessage({ path: 'm/1' });
    expect(cleanUp).not.toHaveBeenCalled();

    connect.ethereumSignMessage.mockResolvedValueOnce({
      success: true,
      payload: { address: '0x0', signature: '0x0' },
      device: { path: 'device-b', state: { staticSessionId: 'session-b' } },
    } as never);
    await bridge.ethereumSignMessage({ path: 'm/1' });
    expect(cleanUp).toHaveBeenCalledWith(true);
  });
});
