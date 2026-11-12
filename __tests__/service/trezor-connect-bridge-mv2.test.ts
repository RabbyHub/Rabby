jest.mock('@/utils/env', () => ({
  isManifestV3: false,
}));

jest.mock('@trezor/connect-web', () => ({
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
jest.mock('@trezor/connect-webextension', () => ({
  __esModule: true,
  default: {
    init: jest.fn(),
  },
}));

import TrezorConnect from '@trezor/connect-web';

import TrezorBridge from '@/background/service/keyring/eth-trezor-keyring/trezor-bridge';

const connect = TrezorConnect as jest.Mocked<typeof TrezorConnect>;

const manifest = {
  email: 'support@rabby.io',
  appName: 'Rabby Wallet',
  appUrl: 'https://rabby.io/',
};

describe('Trezor Connect bridge (MV2)', () => {
  it('uses the web flow so Firefox does not depend on externally_connectable', async () => {
    const bridge = new TrezorBridge();
    await bridge.init({ manifest });
    connect.ethereumSignMessage.mockResolvedValueOnce({
      success: true,
      payload: { address: '0x0', signature: '0x0' },
    } as never);

    await bridge.ethereumSignMessage({ path: 'm/1' });

    expect(connect.init).toHaveBeenCalledWith({
      manifest,
      env: 'web',
    });
  });
});
