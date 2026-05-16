import LatticeKeyring from '@/background/service/keyring/eth-lattice-keyring/eth-lattice-keyring';
import OldLatticeKeyring from '@rabby-wallet/eth-lattice-keyring';

jest.mock('@/utils/env', () => ({
  isManifestV3: true,
}));

jest.mock('@/background/utils', () => ({
  isSameAddress: (a: string, b: string) => a.toLowerCase() === b.toLowerCase(),
}));

const makeKeyring = () => {
  const keyring = new LatticeKeyring() as any;

  keyring.accounts = ['0x0000000000000000000000000000000000000001'];
  keyring.accountIndices = [0];
  keyring.accountOpts = [{ hdPath: "m/44'/60'/0'/0/x" }];
  keyring.hdPath = "m/44'/60'/0'/0/x";
  keyring.unlockedAccount = 0;
  keyring.creds = {
    deviceID: 'stale-device-id',
    password: 'stale-password',
    endpoint: 'https://stale.example',
  };
  keyring.sdkSession = { stale: true };
  keyring.walletUID = 'stale-wallet';
  keyring.isLocked = false;

  return keyring;
};

describe('LatticeKeyring signing recovery', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('clears stale connection state and retries typed data signing once', async () => {
    const keyring = makeKeyring();
    const accounts = keyring.accounts;
    const accountIndices = keyring.accountIndices;
    const accountOpts = keyring.accountOpts;

    const signTypedData = jest
      .spyOn(OldLatticeKeyring.prototype as any, 'signTypedData')
      .mockRejectedValueOnce(new Error('No active wallet in Lattice.'))
      .mockResolvedValueOnce('0xsig');

    await expect(
      keyring.signTypedData(
        '0x0000000000000000000000000000000000000001',
        { message: 'hello' },
        { version: 'V4' }
      )
    ).resolves.toBe('0xsig');

    expect(signTypedData).toHaveBeenCalledTimes(2);
    expect(keyring.creds).toEqual({
      deviceID: null,
      password: null,
      endpoint: null,
    });
    expect(keyring.sdkSession).toBeNull();
    expect(keyring.walletUID).toBeNull();
    expect(keyring.isLocked).toBe(true);
    expect(keyring.accounts).toBe(accounts);
    expect(keyring.accountIndices).toBe(accountIndices);
    expect(keyring.accountOpts).toBe(accountOpts);
  });

  it.each([
    ['signTransaction', ['0x0000000000000000000000000000000000000001', {}]],
    ['signMessage', ['0x0000000000000000000000000000000000000001', '0x1234']],
  ])('recovers stale connection state for %s', async (method, args) => {
    const keyring = makeKeyring();

    const sign = jest
      .spyOn(OldLatticeKeyring.prototype as any, method)
      .mockRejectedValueOnce(new Error('NOT_PAIRED'))
      .mockResolvedValueOnce('0xsig');

    await expect(keyring[method](...args)).resolves.toBe('0xsig');

    expect(sign).toHaveBeenCalledTimes(2);
    expect(keyring.creds).toEqual({
      deviceID: null,
      password: null,
      endpoint: null,
    });
    expect(keyring.accounts).toEqual([
      '0x0000000000000000000000000000000000000001',
    ]);
  });

  it('does not retry or clear credentials for signing validation errors', async () => {
    const keyring = makeKeyring();

    const signTypedData = jest
      .spyOn(OldLatticeKeyring.prototype as any, 'signTypedData')
      .mockRejectedValueOnce(
        new Error('Only signTypedData V3 and V4 messages are supported.')
      );

    await expect(
      keyring.signTypedData(
        '0x0000000000000000000000000000000000000001',
        { message: 'hello' },
        { version: 'V1' }
      )
    ).rejects.toThrow('Only signTypedData V3 and V4 messages are supported.');

    expect(signTypedData).toHaveBeenCalledTimes(1);
    expect(keyring.creds).toEqual({
      deviceID: 'stale-device-id',
      password: 'stale-password',
      endpoint: 'https://stale.example',
    });
    expect(keyring.sdkSession).toEqual({ stale: true });
    expect(keyring.walletUID).toBe('stale-wallet');
    expect(keyring.isLocked).toBe(false);
  });
});
