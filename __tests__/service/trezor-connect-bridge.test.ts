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
      manifest,
      env: 'webextension',
    });
    expect(bridge.getSigningDiagnostics().transport).toBe('unknown');
  });
});
