const mockDecryptWithDetail = jest.fn();
const mockSessionSet = jest.fn();
const mockSessionRemove = jest.fn(async () => undefined);

jest.mock('@/utils/env', () => ({ isManifestV3: true }));
jest.mock('@metamask/browser-passworder', () => ({
  decryptWithDetail: (...args: unknown[]) => mockDecryptWithDetail(...args),
}));
jest.mock('webextension-polyfill', () => ({
  __esModule: true,
  default: {
    storage: {
      session: {
        set: mockSessionSet,
        remove: mockSessionRemove,
      },
    },
  },
}));

import { passwordClearKey, passwordDecrypt } from '@/background/utils/password';

const decryptPerps = () =>
  passwordDecrypt({
    encryptedData: 'ciphertext',
    password: 'password-before-lock',
    persisted: true,
    persistType: 'perps',
  });

describe('perps session keys during lock', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not write a key when decryption completes after lock', async () => {
    let resolveDecrypt!: (value: unknown) => void;
    mockDecryptWithDetail.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveDecrypt = resolve;
        })
    );

    const pending = decryptPerps();
    await passwordClearKey('perps');
    resolveDecrypt({ vault: {}, exportedKeyString: 'secret', salt: 'salt' });

    await expect(pending).rejects.toThrow('Wallet is locked');
    expect(mockSessionSet).not.toHaveBeenCalled();
  });

  it('waits for an in-flight write before clearing its key', async () => {
    let resolveWrite!: () => void;
    mockDecryptWithDetail.mockResolvedValue({
      vault: {},
      exportedKeyString: 'secret',
      salt: 'salt',
    });
    mockSessionSet.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveWrite = resolve;
        })
    );

    const pending = decryptPerps();
    await Promise.resolve();
    expect(mockSessionSet).toHaveBeenCalledTimes(1);

    const clearing = passwordClearKey('perps');
    expect(mockSessionRemove).not.toHaveBeenCalled();
    resolveWrite();

    await expect(pending).rejects.toThrow('Wallet is locked');
    await clearing;
    expect(mockSessionRemove).toHaveBeenCalledWith(['perpsVault']);
  });
});
