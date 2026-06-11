import { sanitizeUnencryptedKeyringData } from 'background/service/keyring/sanitizeUnencryptedKeyringData';

describe('sanitizeUnencryptedKeyringData', () => {
  const gridPlusType = 'GridPlus Hardware';
  const gridPlusData = {
    creds: {
      deviceID: 'device-123',
      password: 'pairing-secret',
      endpoint: 'https://lattice.example',
    },
    accounts: ['0x1111111111111111111111111111111111111111'],
    accountIndices: [0],
    accountOpts: [{ walletUID: 'wallet-1', hdPath: "m/44'/60'/0'/0/x" }],
    walletUID: 'wallet-1',
    appName: 'Rabby',
    hdPath: "m/44'/60'/0'/0/x",
  };

  it('redacts GridPlus creds while preserving non-secret metadata', () => {
    expect(
      sanitizeUnencryptedKeyringData(
        {
          type: gridPlusType,
          data: gridPlusData,
        },
        gridPlusType
      )
    ).toEqual({
      type: gridPlusType,
      data: {
        accounts: gridPlusData.accounts,
        accountIndices: gridPlusData.accountIndices,
        accountOpts: gridPlusData.accountOpts,
        walletUID: gridPlusData.walletUID,
        appName: gridPlusData.appName,
        hdPath: gridPlusData.hdPath,
      },
    });
  });

  it('leaves other keyring data unchanged', () => {
    const item = {
      type: 'Ledger Hardware',
      data: {
        creds: gridPlusData.creds,
        accounts: gridPlusData.accounts,
      },
    };

    expect(sanitizeUnencryptedKeyringData(item, gridPlusType)).toBe(item);
  });
});
