import { of, throwError } from 'rxjs';

const mockListenToAvailableDevices = jest.fn();
const mockConnect = jest.fn();
const mockDisconnect = jest.fn();
const mockGetDeviceSessionState = jest.fn();
const mockExecuteDeviceAction = jest.fn();
const mockGetAddress = jest.fn();

const connectedState = {
  deviceStatus: 'CONNECTED',
  sessionStateType: 1,
  currentApp: {
    name: 'Ethereum',
    version: '1.0.0',
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
      Completed: 'completed',
      Error: 'error',
      Stopped: 'stopped',
    },
    DeviceManagementKitBuilder: jest.fn().mockImplementation(() => ({
      addTransport: jest.fn().mockReturnThis(),
      build: jest.fn(() => ({
        listenToAvailableDevices: mockListenToAvailableDevices,
        connect: mockConnect,
        disconnect: mockDisconnect,
        getDeviceSessionState: mockGetDeviceSessionState,
        executeDeviceAction: mockExecuteDeviceAction,
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

jest.mock(
  '@ledgerhq/device-signer-kit-ethereum',
  () => ({
    SignerEthBuilder: jest.fn().mockImplementation(() => ({
      build: () => ({
        getAddress: mockGetAddress,
      }),
    })),
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
  isManifestV3: false,
}));

import LedgerBridgeKeyring from 'background/service/keyring/eth-ledger-keyring';

describe('LedgerBridgeKeyring makeApp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListenToAvailableDevices.mockReturnValue(of([{ id: 'ledger' }]));
    mockDisconnect.mockResolvedValue(undefined);
    mockGetDeviceSessionState.mockReturnValue(of(connectedState));
    mockExecuteDeviceAction.mockReturnValue({
      observable: of({
        status: 'completed',
        output: undefined,
      }),
    });
    mockConnect.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve('session-1'), 0))
    );
    mockGetAddress.mockReturnValue({
      observable: of({
        status: 'completed',
        output: {
          address: '0x0000000000000000000000000000000000000001',
          publicKey: 'public-key',
        },
      }),
    });
  });

  it('shares a pending Ledger session open across concurrent callers', async () => {
    const keyring = new LedgerBridgeKeyring();

    await Promise.all([
      keyring.unlock("m/44'/60'/0'/0/0"),
      keyring.unlock("m/44'/60'/0'/0/0"),
    ]);

    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(mockGetAddress).toHaveBeenCalledWith("44'/60'/0'/0/0", {
      checkOnDevice: false,
      returnChainCode: true,
      skipOpenApp: true,
    });
    await keyring.cleanUp();
  });

  it('does not reuse a disconnected Ledger session', async () => {
    const keyring = new LedgerBridgeKeyring();

    await keyring.unlock("m/44'/60'/0'/0/0");
    mockGetDeviceSessionState.mockReturnValueOnce(
      of({
        ...connectedState,
        deviceStatus: 'NOT CONNECTED',
      })
    );
    mockConnect.mockResolvedValueOnce('session-2');

    await keyring.unlock("m/44'/60'/0'/0/0");

    expect(mockDisconnect).toHaveBeenCalledWith({ sessionId: 'session-1' });
    expect(mockConnect).toHaveBeenCalledTimes(2);
    await keyring.cleanUp();
  });

  it('reconnects when address lookup reports a wrapped disconnect error', async () => {
    const keyring = new LedgerBridgeKeyring();
    mockGetAddress
      .mockReturnValueOnce({
        observable: of({
          status: 'error',
          error: {
            _tag: 'DeviceDisconnectedWhileSendingError',
          },
        }),
      })
      .mockReturnValueOnce({
        observable: of({
          status: 'completed',
          output: {
            address: '0x0000000000000000000000000000000000000001',
            publicKey: 'public-key',
          },
        }),
      });

    await expect(keyring.unlock("m/44'/60'/0'/0/0")).resolves.toBe(
      '0x0000000000000000000000000000000000000001'
    );

    expect(mockDisconnect).toHaveBeenCalledWith({ sessionId: 'session-1' });
    expect(mockConnect).toHaveBeenCalledTimes(2);
    await keyring.cleanUp();
  });

  it('opens the Ethereum app before operations when another app is active', async () => {
    const keyring = new LedgerBridgeKeyring();
    mockGetDeviceSessionState.mockReturnValue(
      of({
        ...connectedState,
        currentApp: {
          name: 'BOLOS',
          version: '1.0.0',
        },
      })
    );

    await keyring.openEthApp();

    expect(mockExecuteDeviceAction).toHaveBeenCalledTimes(1);
    await keyring.cleanUp();
  });

  it('does not ask the device to open Ethereum when it is already active', async () => {
    const keyring = new LedgerBridgeKeyring();

    await keyring.openEthApp();

    expect(mockExecuteDeviceAction).not.toHaveBeenCalled();
    await keyring.cleanUp();
  });

  it('cancels an app open action that never finishes', async () => {
    const keyring = new LedgerBridgeKeyring();
    const cancel = jest.fn();
    mockGetDeviceSessionState.mockReturnValue(
      of({
        ...connectedState,
        currentApp: {
          name: 'BOLOS',
          version: '1.0.0',
        },
      })
    );
    mockExecuteDeviceAction.mockReturnValueOnce({
      observable: throwError(() => ({
        name: 'TimeoutError',
      })),
      cancel,
    });

    await expect(keyring.openEthApp()).rejects.toThrow(
      'Ledger: Operation timed out'
    );
    expect(cancel).toHaveBeenCalledTimes(1);
    await keyring.cleanUp();
  });

  it('rejects incomplete typed data before touching the device', async () => {
    const keyring = new LedgerBridgeKeyring();

    await expect(
      keyring.signTypedData(
        '0x0000000000000000000000000000000000000001',
        {
          domain: {},
          types: {},
        },
        { version: 'V4' }
      )
    ).rejects.toThrow('Ledger: Typed data payload is incomplete');

    expect(mockConnect).not.toHaveBeenCalled();
  });
});
