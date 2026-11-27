import { of } from 'rxjs';

const mockListenToAvailableDevices = jest.fn();
const mockConnect = jest.fn();
const mockDisconnect = jest.fn();
const mockGetDeviceSessionState = jest.fn();
const mockExecuteDeviceAction = jest.fn();
const mockSendApdu = jest.fn();
const mockGetAddress = jest.fn();
const mockSignTransaction = jest.fn();
const mockSignTypedData = jest.fn();

const connectedState = {
  deviceStatus: 'CONNECTED',
  sessionStateType: 1,
  currentApp: {
    name: 'Ethereum',
    version: '1.24.0',
  },
};

jest.mock(
  '@ledgerhq/device-management-kit',
  () => ({
    DeviceStatus: {
      CONNECTED: 'CONNECTED',
      LOCKED: 'LOCKED',
      BUSY: 'BUSY',
      NOT_CONNECTED: 'NOT CONNECTED',
    },
    DeviceSessionStateType: {
      Connected: 0,
      ReadyWithoutSecureChannel: 1,
      ReadyWithSecureChannel: 2,
    },
    DeviceActionStatus: {
      Pending: 'pending',
      Completed: 'completed',
      Error: 'error',
      Stopped: 'stopped',
    },
    UserInteractionRequired: {
      UnlockDevice: 'unlock-device',
    },
    DeviceManagementKitBuilder: jest.fn().mockImplementation(() => ({
      addTransport: jest.fn().mockReturnThis(),
      build: jest.fn(() => ({
        listenToAvailableDevices: mockListenToAvailableDevices,
        connect: mockConnect,
        disconnect: mockDisconnect,
        getDeviceSessionState: mockGetDeviceSessionState,
        executeDeviceAction: mockExecuteDeviceAction,
        sendApdu: mockSendApdu,
      })),
    })),
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

jest.mock('webextension-polyfill', () => ({
  runtime: {
    id: 'test-extension',
    onMessage: { addListener: jest.fn() },
  },
}));

jest.mock(
  '@ledgerhq/context-module',
  () => ({
    ClearSignContextType: { ERROR: 'error' },
    ContextModuleChainID: { Ethereum: 'ethereum' },
    ContextModuleBuilder: jest.fn(),
  }),
  { virtual: true }
);

jest.mock(
  '@ledgerhq/device-signer-kit-ethereum',
  () => ({
    SignerEthBuilder: jest.fn().mockImplementation(() => ({
      withContextModule: jest.fn().mockReturnThis(),
      build: () => ({
        getAddress: mockGetAddress,
        signTransaction: mockSignTransaction,
        signTypedData: mockSignTypedData,
      }),
    })),
  }),
  { virtual: true }
);

jest.mock('@/background/service/preference', () => ({
  __esModule: true,
  default: { getIsLedgerClearSigningEnabled: () => false },
}));

jest.mock('@/utils/transaction', () => ({
  is1559Tx: jest.fn(),
}));

jest.mock('@/background/utils', () => ({
  isSameAddress: (a: string, b: string) => a.toLowerCase() === b.toLowerCase(),
}));

jest.mock('@/utils/env', () => ({
  isManifestV3: true,
}));

import LedgerBridgeKeyring from 'background/service/keyring/eth-ledger-keyring';
import { LEDGER_BLIND_SIGNING_DISABLED_ERROR } from '@/constant/ledger';

const address = '0x0000000000000000000000000000000000000001';
const hdPath = "m/44'/60'/0'/0/0";

// What the DMK signer reports after both the context-free attempt and the
// blind-sign fallback were refused by the Ethereum app.
const invalidDataError = () => ({
  _tag: 'EthAppCommandError',
  errorCode: '6a80',
  message: 'Invalid data',
});

const appConfigResponse = (flags: number, statusCode = [0x90, 0x00]) => ({
  statusCode: Uint8Array.from(statusCode),
  data: Uint8Array.from([flags, 1, 24, 0]),
});

const makeKeyring = () =>
  new LedgerBridgeKeyring({
    accounts: [address],
    accountDetails: { [address]: { hdPath } },
  });

const legacyTx = () =>
  ({
    getChainId: () => Uint8Array.from([1]),
    serialize: () => Buffer.from('f86c', 'hex'),
    verifySignature: () => true,
  } as any);

const typedData = {
  domain: {
    name: 'Test',
    version: '1',
    chainId: 1,
    verifyingContract: address,
  },
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
  message: { contents: 'Hello' },
};

const failingAction = (error: unknown) => ({
  observable: of({ status: 'error', error }),
  cancel: jest.fn(),
});

const signTransactionError = async (keyring: LedgerBridgeKeyring) => {
  let rejection: any;
  await keyring.signTransaction(address, legacyTx()).then(
    () => {
      throw new Error('expected the Ledger signature to be refused');
    },
    (error) => {
      rejection = error;
    }
  );
  return rejection;
};

describe('Ledger 0x6a80 and the Blind signing setting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListenToAvailableDevices.mockReturnValue(of([], [{ id: 'ledger' }]));
    mockConnect.mockResolvedValue('session-1');
    mockDisconnect.mockResolvedValue(undefined);
    mockGetDeviceSessionState.mockReturnValue(of(connectedState));
    mockGetAddress.mockReturnValue({
      observable: of({
        status: 'completed',
        output: { address, publicKey: 'public-key' },
      }),
      cancel: jest.fn(),
    });
  });

  it('tells the user to turn on Blind signing when the Ethereum app has it off', async () => {
    const keyring = makeKeyring();
    let disconnectsBeforeProbe = -1;
    mockSignTransaction.mockReturnValueOnce(failingAction(invalidDataError()));
    mockSendApdu.mockImplementationOnce(async () => {
      disconnectsBeforeProbe = mockDisconnect.mock.calls.length;
      return appConfigResponse(0x00);
    });

    try {
      const error = await signTransactionError(keyring);

      expect(error.message).toContain(LEDGER_BLIND_SIGNING_DISABLED_ERROR);
      expect(error.message).toContain('0x6a80');
      expect(mockSendApdu).toHaveBeenCalledTimes(1);
      expect(mockSendApdu).toHaveBeenCalledWith({
        sessionId: 'session-1',
        apdu: Uint8Array.from([0xe0, 0x06, 0x00, 0x00, 0x00]),
        abortTimeout: 3000,
      });
      // The probe reuses the signing session instead of reconnecting.
      expect(disconnectsBeforeProbe).toBe(0);
      expect(mockConnect).toHaveBeenCalledTimes(1);

      const diagnostics = keyring.getLedgerSigningDiagnostics(error);
      expect(diagnostics).toMatchObject({
        provider_code: '0x6a80',
        provider_error_tag: 'EthAppCommandError',
        provider_reason: 'blind_signing_disabled',
        provider_metadata: { blind_signing_enabled: false },
      });
    } finally {
      await keyring.cleanUp();
    }
  });

  it('keeps the original 0x6a80 error when Blind signing is already on', async () => {
    const keyring = makeKeyring();
    mockSignTransaction.mockReturnValueOnce(failingAction(invalidDataError()));
    // Bit 0 set; the other bits (web3 checks) must not matter.
    mockSendApdu.mockResolvedValueOnce(appConfigResponse(0x31));

    try {
      const error = await signTransactionError(keyring);

      expect(error.message).not.toContain(LEDGER_BLIND_SIGNING_DISABLED_ERROR);
      expect(error.message).toContain('Invalid data');
      expect(error.message).toContain('0x6a80');

      const diagnostics = keyring.getLedgerSigningDiagnostics(error);
      expect(diagnostics).toMatchObject({
        provider_code: '0x6a80',
        provider_reason: 'invalid_data',
        provider_metadata: { blind_signing_enabled: true },
      });
    } finally {
      await keyring.cleanUp();
    }
  });

  it.each([
    [
      'the app rejects the configuration request',
      () => mockSendApdu.mockResolvedValueOnce(appConfigResponse(0, [0x6d, 0])),
    ],
    [
      'the configuration request fails',
      () =>
        mockSendApdu.mockRejectedValueOnce(new Error('Ledger: Device busy')),
    ],
  ])(
    'keeps the original 0x6a80 error when %s',
    async (_label, arrangeProbe) => {
      const keyring = makeKeyring();
      mockSignTransaction.mockReturnValueOnce(
        failingAction(invalidDataError())
      );
      arrangeProbe();

      try {
        const error = await signTransactionError(keyring);

        expect(error.message).not.toContain(
          LEDGER_BLIND_SIGNING_DISABLED_ERROR
        );
        expect(error.message).toContain('0x6a80');
        const diagnostics = keyring.getLedgerSigningDiagnostics(error);
        expect(diagnostics.provider_reason).toBe('invalid_data');
        expect(diagnostics.provider_metadata).not.toHaveProperty(
          'blind_signing_enabled'
        );
      } finally {
        await keyring.cleanUp();
      }
    }
  );

  it('does not query the app configuration for other Ledger errors', async () => {
    const keyring = makeKeyring();
    mockSignTransaction.mockReturnValueOnce(
      failingAction({
        _tag: 'EthAppCommandError',
        errorCode: '6985',
        message: 'Condition not satisfied',
      })
    );

    try {
      const error = await signTransactionError(keyring);

      expect(error.message).toContain('0x6985');
      expect(mockSendApdu).not.toHaveBeenCalled();
    } finally {
      await keyring.cleanUp();
    }
  });

  it('tells the user to turn on Blind signing for typed data refused with 0x6a80', async () => {
    const keyring = makeKeyring();
    mockSignTypedData.mockReturnValueOnce(failingAction(invalidDataError()));
    mockSendApdu.mockResolvedValueOnce(appConfigResponse(0x00));

    try {
      await expect(
        keyring.signTypedData(address, typedData, { version: 'V4' })
      ).rejects.toThrow(LEDGER_BLIND_SIGNING_DISABLED_ERROR);
      expect(mockSendApdu).toHaveBeenCalledTimes(1);
    } finally {
      await keyring.cleanUp();
    }
  });
});
