jest.mock('background/utils/password', () => ({
  passwordEncrypt: jest.fn(async ({ data }: { data: unknown }) =>
    JSON.stringify(data)
  ),
  passwordDecrypt: jest.fn(
    async ({ encryptedData }: { encryptedData: string }) =>
      typeof encryptedData === 'string'
        ? JSON.parse(encryptedData)
        : encryptedData
  ),
  passwordClearKey: jest.fn(),
}));

jest.mock('@/i18n', () => {
  if (typeof (global as any).fetch !== 'function') {
    (global as any).fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({}),
    }));
  }
  return {
    __esModule: true,
    default: { t: (k: string) => k },
    addResourceBundle: jest.fn(),
    fetchLocale: jest.fn(),
  };
});

jest.mock(
  'multiformats',
  () => ({
    CID: class CID {},
  }),
  { virtual: true }
);

const mockBridge = {
  init: jest.fn().mockResolvedValue(undefined),
  cancel: jest.fn(),
  evmSignMessage: jest.fn(),
  evmSignTypedData: jest.fn(),
  evmSignTransaction: jest.fn(),
  searchDevices: jest.fn().mockResolvedValue({
    success: true,
    payload: [{ connectId: 'usb-path', deviceType: 'pro2' }],
  }),
  getDeviceState: jest.fn().mockResolvedValue({
    success: true,
    payload: {
      protocol: 'V2',
      identity: { deviceId: 'authoritative-device-id', deviceType: 'pro2' },
    },
  }),
  getPassphraseState: jest.fn(),
  openWalletSession: jest.fn(),
  evmGetPublicKey: jest.fn(),
};

jest.mock('@/background/service/keyring/bridge', () => ({
  hasBridge: jest.fn().mockResolvedValue(true),
  getKeyringBridge: jest.fn().mockResolvedValue(mockBridge),
}));

jest.mock('@/background/service/keyring/eth-ledger-keyring', () => {
  class MockLedger {
    static type = 'Ledger Hardware';
    type = 'Ledger Hardware';
    getAccounts = jest.fn().mockResolvedValue([]);
    serialize = jest.fn().mockResolvedValue({});
    deserialize = jest.fn().mockResolvedValue(undefined);
  }
  return { __esModule: true, default: MockLedger };
});

jest.mock(
  '@/background/service/keyring/eth-lattice-keyring/eth-lattice-keyring',
  () => {
    class MockLattice {
      static type = 'GridPlus Hardware';
      type = 'GridPlus Hardware';
      getAccounts = jest.fn().mockResolvedValue([]);
      serialize = jest.fn().mockResolvedValue({});
      deserialize = jest.fn().mockResolvedValue(undefined);
    }
    return { __esModule: true, default: MockLattice };
  }
);

jest.mock('@/background/service/keyring/eth-keystone-keyring', () => {
  class MockKeystone {
    static type = 'Keystone Hardware';
    type = 'Keystone Hardware';
    getAccounts = jest.fn().mockResolvedValue([]);
    serialize = jest.fn().mockResolvedValue({});
    deserialize = jest.fn().mockResolvedValue(undefined);
  }
  return { __esModule: true, default: MockKeystone };
});

jest.mock(
  '@/background/service/keyring/eth-imkey-keyring/eth-imkey-keyring',
  () => {
    class MockImKey {
      static type = 'imKey Hardware';
      type = 'imKey Hardware';
      getAccounts = jest.fn().mockResolvedValue([]);
      serialize = jest.fn().mockResolvedValue({});
      deserialize = jest.fn().mockResolvedValue(undefined);
    }
    return { __esModule: true, EthImKeyKeyring: MockImKey };
  }
);

jest.mock(
  '@/background/service/keyring/eth-bitbox02-keyring/eth-bitbox02-keyring',
  () => {
    class MockBitBox02 {
      static type = 'BitBox02 Hardware';
      type = 'BitBox02 Hardware';
      getAccounts = jest.fn().mockResolvedValue([]);
      serialize = jest.fn().mockResolvedValue({});
      deserialize = jest.fn().mockResolvedValue(undefined);
    }
    return { __esModule: true, default: MockBitBox02 };
  }
);

jest.mock('@rabby-wallet/eth-trezor-keyring', () => {
  class MockTrezor {
    static type = 'Trezor Hardware';
    type = 'Trezor Hardware';
    getAccounts = jest.fn().mockResolvedValue([]);
    serialize = jest.fn().mockResolvedValue({});
    deserialize = jest.fn().mockResolvedValue(undefined);
  }
  return { __esModule: true, default: MockTrezor };
});

jest.mock('@/background/service/keyring/eth-gnosis-keyring', () => {
  class MockGnosis {
    static type = 'Gnosis Safe';
    type = 'Gnosis Safe';
    getAccounts = jest.fn().mockResolvedValue([]);
    serialize = jest.fn().mockResolvedValue({});
    deserialize = jest.fn().mockResolvedValue(undefined);
  }
  return {
    __esModule: true,
    default: MockGnosis,
    TransactionBuiltEvent: 'TransactionBuiltEvent',
    TransactionConfirmedEvent: 'TransactionConfirmedEvent',
  };
});

jest.mock('@rabby-wallet/eth-walletconnect-keyring', () => {
  class MockWC {
    static type = 'WalletConnect';
    type = 'WalletConnect';
    getAccounts = jest.fn().mockResolvedValue([]);
    serialize = jest.fn().mockResolvedValue({});
    deserialize = jest.fn().mockResolvedValue(undefined);
  }
  return { __esModule: true, WalletConnectKeyring: MockWC };
});

jest.mock('@rabby-wallet/eth-coinbase-keyring', () => {
  class MockCoinbase {
    static type = 'Coinbase';
    type = 'Coinbase';
    getAccounts = jest.fn().mockResolvedValue([]);
    serialize = jest.fn().mockResolvedValue({});
    deserialize = jest.fn().mockResolvedValue(undefined);
  }
  return { __esModule: true, default: MockCoinbase };
});

import { KeyringService } from '@/background/service/keyring';
import { KEYRING_CLASS } from 'consts';

describe('KeyringService OneKey persistence and lock cleanup (C1, C5)', () => {
  const password = 'password123';
  const from = '0x19E7E376E7C213B7E7e7e46cc70A5dD086DAff2A';

  async function bootedService() {
    const keyringService = new KeyringService();
    keyringService.loadStore({});
    await keyringService.boot(password);
    await keyringService.clearKeyrings();
    return keyringService;
  }

  it('persists the vault after OneKey consumePassphraseStateCleared on a successful sign (C5)', async () => {
    const keyringService = await bootedService();
    const persistUpdateSpy = jest.spyOn(keyringService, 'persistUpdate');
    const persistAllSpy = jest.spyOn(keyringService, 'persistAllKeyrings');
    const keyring = {
      type: KEYRING_CLASS.HARDWARE.ONEKEY,
      consumePassphraseStateCleared: jest
        .fn()
        .mockReturnValueOnce(true)
        .mockReturnValue(false),
      signPersonalMessage: jest.fn().mockResolvedValue('0xsig'),
    };

    await expect(
      keyringService.signPersonalMessage(keyring, {
        from,
        data: '0x48656c6c6f',
      })
    ).resolves.toBe('0xsig');

    expect(persistUpdateSpy).toHaveBeenCalledTimes(1);
    expect(persistAllSpy).toHaveBeenCalled();
    expect(keyring.consumePassphraseStateCleared).toHaveBeenCalled();
  });

  it('does not persist when OneKey did not clear passphrase state', async () => {
    const keyringService = await bootedService();
    const persistUpdateSpy = jest.spyOn(keyringService, 'persistUpdate');
    const keyring = {
      type: KEYRING_CLASS.HARDWARE.ONEKEY,
      consumePassphraseStateCleared: jest.fn().mockReturnValue(false),
      signPersonalMessage: jest.fn().mockResolvedValue('0xsig'),
    };

    await expect(
      keyringService.signPersonalMessage(keyring, {
        from,
        data: '0x48656c6c6f',
      })
    ).resolves.toBe('0xsig');

    expect(persistUpdateSpy).not.toHaveBeenCalled();
  });

  it('setLocked cancels OneKey work and awaits cleanUp (C1)', async () => {
    const keyringService = await bootedService();
    const onekey = {
      type: KEYRING_CLASS.HARDWARE.ONEKEY,
      cancelPendingWork: jest.fn(),
      cleanUp: jest.fn().mockResolvedValue(undefined),
    };
    const other = {
      type: KEYRING_CLASS.HARDWARE.TREZOR,
      cleanUp: jest.fn(),
    };
    keyringService.keyrings = [onekey, other];

    await keyringService.setLocked();

    expect(onekey.cancelPendingWork).toHaveBeenCalledTimes(1);
    expect(onekey.cleanUp).toHaveBeenCalledWith();
    expect(other.cleanUp).toHaveBeenCalledWith();
    expect(keyringService.keyrings).toHaveLength(0);
    expect(keyringService.memStore.getState().isUnlocked).toBe(false);
  });
});
