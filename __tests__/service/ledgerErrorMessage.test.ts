jest.mock(
  '@ledgerhq/device-management-kit',
  () => ({
    DeviceActionStatus: {},
    DeviceManagementKitBuilder: jest.fn(),
    CloseAppCommand: jest.fn(),
    GetAppAndVersionCommand: jest.fn(),
    OpenAppDeviceAction: jest.fn(),
    isSuccessCommandResult: jest.fn(),
  }),
  { virtual: true }
);

jest.mock(
  '@ledgerhq/device-transport-kit-web-hid',
  () => ({
    webHidIdentifier: 'webhid',
    webHidTransportFactory: jest.fn(),
  }),
  { virtual: true }
);

jest.mock(
  '@ledgerhq/device-signer-kit-ethereum',
  () => ({
    SignerEthBuilder: jest.fn(),
  }),
  { virtual: true }
);

jest.mock('@/utils/transaction', () => ({
  is1559Tx: jest.fn(),
}));

jest.mock('@/background/utils', () => ({
  isSameAddress: (a: string, b: string) => a.toLowerCase() === b.toLowerCase(),
}));

jest.mock('@/utils/env', () => ({
  isManifestV3: true,
}));

import { getLedgerErrorMessage } from 'background/service/keyring/eth-ledger-keyring';

describe('getLedgerErrorMessage', () => {
  it('extracts readable DMK object errors without losing status codes', () => {
    const err = {
      name: 'UserRejected',
      message: {
        statusCode: '0x6985',
        message: 'Condition of use not satisfied',
      },
    };

    const message = getLedgerErrorMessage(err, 'Ledger: Unknown error');

    expect(message).toContain('UserRejected');
    expect(message).toContain('0x6985');
    expect(message).toContain('Condition of use not satisfied');
    expect(message).not.toContain('[object Object]');
  });

  it('extracts DMK device-action tags and original errors', () => {
    const err = {
      _tag: 'RefusedByUserDAError',
      originalError: new Error('Ledger device rejected with status 0x6985'),
    };

    const message = getLedgerErrorMessage(err, 'Ledger: Unknown error');

    expect(message).toContain('RefusedByUserDAError');
    expect(message).toContain('0x6985');
    expect(message).toContain('Ledger device rejected');
    expect(message).not.toContain('[object Object]');
  });

  it('maps bare DMK user rejection tags to the legacy Ledger status word', () => {
    const message = getLedgerErrorMessage(
      {
        _tag: 'RefusedByUserDAError',
      },
      'Ledger: Unknown error'
    );

    expect(message).toContain('RefusedByUserDAError');
    expect(message).toContain('0x6985');
  });
});
