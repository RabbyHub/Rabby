import { BehaviorSubject, of, Subject } from 'rxjs';

const mockListenToAvailableDevices = jest.fn();
const mockConnect = jest.fn();
const mockDisconnect = jest.fn();
const mockGetDeviceSessionState = jest.fn();
const mockExecuteDeviceAction = jest.fn();
const mockGetAddress = jest.fn();
const mockSignTransaction = jest.fn();
const mockContextModule = { clearSigning: true };
const mockRemoveDefaultLoaders = jest.fn();
const mockAddTypedDataLoader = jest.fn();
const mockSetChain = jest.fn();
const mockSetBlindSigningReporter = jest.fn();
const mockContextModuleBuild = jest.fn();
const mockWithContextModule = jest.fn();
let mockRuntimeMessageListener: ((request: any) => void) | undefined;
const mockRuntimeOnMessageAddListener = jest.fn((listener) => {
  mockRuntimeMessageListener = listener;
});

const flushMicrotasks = async () => {
  for (let i = 0; i < 10; i++) {
    await Promise.resolve();
  }
};

const waitForMockCall = async (mock: jest.Mock) => {
  for (let i = 0; i < 100 && mock.mock.calls.length === 0; i++) {
    await Promise.resolve();
  }
};

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
    onMessage: {
      addListener: mockRuntimeOnMessageAddListener,
    },
  },
}));

jest.mock(
  '@ledgerhq/context-module',
  () => ({
    ContextModuleChainID: {
      Ethereum: 'ethereum',
    },
    ContextModuleBuilder: jest.fn().mockImplementation(() => ({
      removeDefaultLoaders: mockRemoveDefaultLoaders.mockReturnThis(),
      addTypedDataLoader: mockAddTypedDataLoader.mockReturnThis(),
      setChain: mockSetChain.mockReturnThis(),
      setBlindSigningReporter: mockSetBlindSigningReporter.mockReturnThis(),
      build: mockContextModuleBuild.mockReturnValue(mockContextModule),
    })),
  }),
  { virtual: true }
);

jest.mock(
  '@ledgerhq/device-signer-kit-ethereum',
  () => ({
    SignerEthBuilder: jest.fn().mockImplementation(() => ({
      withContextModule: mockWithContextModule.mockReturnThis(),
      build: () => ({
        getAddress: mockGetAddress,
        signTransaction: mockSignTransaction,
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
  isManifestV3: true,
}));

import LedgerBridgeKeyring from 'background/service/keyring/eth-ledger-keyring';

describe('LedgerBridgeKeyring makeApp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListenToAvailableDevices.mockReturnValue(of([], [{ id: 'ledger' }]));
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

  it('rejects as soon as the refreshed Ledger device list is empty', async () => {
    const keyring = new LedgerBridgeKeyring();
    const devices$ = new BehaviorSubject<any[]>([]);
    let rejection: Error | undefined;
    mockListenToAvailableDevices.mockReturnValueOnce(devices$);

    const operation = keyring.unlock("m/44'/60'/0'/0/0").catch((error) => {
      rejection = error;
    });

    await waitForMockCall(mockListenToAvailableDevices);
    expect(mockListenToAvailableDevices).toHaveBeenCalledTimes(1);

    devices$.next([]);
    await flushMicrotasks();

    try {
      expect(rejection?.message).toBe(
        'Ledger: No connected Ledger device found'
      );
      expect(mockConnect).not.toHaveBeenCalled();
    } finally {
      if (!rejection) {
        devices$.error(new Error('test cleanup'));
      }
      await operation;
      await keyring.cleanUp();
    }
  });

  it('stops a pending device refresh when the Ledger session is cleaned up', async () => {
    const keyring = new LedgerBridgeKeyring();
    const devices$ = new BehaviorSubject<any[]>([]);
    let rejection: Error | undefined;
    mockListenToAvailableDevices.mockReturnValueOnce(devices$);

    const operation = keyring.unlock("m/44'/60'/0'/0/0").catch((error) => {
      rejection = error;
    });
    await waitForMockCall(mockListenToAvailableDevices);

    await keyring.cleanUp();
    await flushMicrotasks();

    try {
      expect(rejection?.message).toBe('Ledger: Device disconnected');
      devices$.next([{ id: 'ledger' }]);
      await flushMicrotasks();
      expect(mockConnect).not.toHaveBeenCalled();
    } finally {
      if (!rejection) {
        devices$.error(new Error('test cleanup'));
      }
      await operation;
      await keyring.cleanUp();
    }
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

  it('serializes concurrent address lookups on one Ledger session', async () => {
    const keyring = new LedgerBridgeKeyring();
    try {
      await Promise.all([
        keyring.unlock("m/44'/60'/0'/0/0"),
        keyring.unlock("m/44'/60'/0'/0/0"),
      ]);

      expect(mockGetAddress).toHaveBeenCalledTimes(1);
    } finally {
      await keyring.cleanUp();
    }
  });

  it('releases the WebHID session once the operation chain is idle', async () => {
    const keyring = new LedgerBridgeKeyring();

    await keyring.unlock("m/44'/60'/0'/0/0");
    expect(mockDisconnect).not.toHaveBeenCalled();

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockDisconnect).toHaveBeenCalledWith({ sessionId: 'session-1' });
  });

  it('releases the WebHID session when address preflight fails', async () => {
    const keyring = new LedgerBridgeKeyring();
    mockGetDeviceSessionState.mockReturnValue(
      of({
        ...connectedState,
        deviceStatus: 'LOCKED',
      })
    );

    await expect(keyring.unlock("m/44'/60'/0'/0/0")).rejects.toThrow(
      'Ledger: Device is locked 0x5515'
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockDisconnect).toHaveBeenCalledWith({ sessionId: 'session-1' });
  });

  it('releases the WebHID session when app close preflight fails', async () => {
    const keyring = new LedgerBridgeKeyring();
    mockGetDeviceSessionState.mockReturnValue(
      of({
        ...connectedState,
        deviceStatus: 'LOCKED',
      })
    );

    await expect(keyring.quitApp()).rejects.toThrow(
      'Ledger: Device is locked 0x5515'
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockDisconnect).toHaveBeenCalledWith({ sessionId: 'session-1' });
  });

  it('keeps the WebHID session while another device action is running', async () => {
    const keyring = new LedgerBridgeKeyring();
    const firstActionState$ = new Subject<any>();
    const secondActionState$ = new Subject<any>();
    mockGetDeviceSessionState.mockReturnValue(
      of({
        ...connectedState,
        currentApp: {
          name: 'BOLOS',
          version: '1.0.0',
        },
      })
    );
    mockExecuteDeviceAction
      .mockReturnValueOnce({
        observable: firstActionState$,
        cancel: jest.fn(),
      })
      .mockReturnValueOnce({
        observable: secondActionState$,
        cancel: jest.fn(),
      });

    const firstOperation = keyring.openEthApp();
    const secondOperation = keyring.openEthApp();
    const secondResult = secondOperation.then(
      () => undefined,
      (error) => error
    );

    try {
      for (
        let i = 0;
        i < 100 && mockExecuteDeviceAction.mock.calls.length < 2;
        i++
      ) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      expect(mockExecuteDeviceAction).toHaveBeenCalledTimes(2);

      firstActionState$.next({ status: 'completed', output: undefined });
      await firstOperation;
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockDisconnect).not.toHaveBeenCalled();

      secondActionState$.next({ status: 'completed', output: undefined });
      expect(await secondResult).toBeUndefined();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockDisconnect).toHaveBeenCalledWith({ sessionId: 'session-1' });
    } finally {
      firstActionState$.complete();
      secondActionState$.complete();
      await Promise.allSettled([firstOperation, secondOperation]);
      await keyring.cleanUp();
    }
  });

  it('builds the DMK signer with default clear signing and no origin token', async () => {
    const keyring = new LedgerBridgeKeyring();

    await keyring.unlock("m/44'/60'/0'/0/0");

    const { ContextModuleBuilder } = jest.requireMock(
      '@ledgerhq/context-module'
    );
    const { SignerEthBuilder } = jest.requireMock(
      '@ledgerhq/device-signer-kit-ethereum'
    );
    expect(ContextModuleBuilder).toHaveBeenCalledWith({
      networkTimeoutMs: 5000,
    });
    expect(SignerEthBuilder.mock.calls[0][0]).not.toHaveProperty('originToken');
    expect(mockRemoveDefaultLoaders).not.toHaveBeenCalled();
    expect(mockAddTypedDataLoader).not.toHaveBeenCalled();
    expect(mockSetChain).toHaveBeenCalledWith('ethereum');
    expect(mockSetBlindSigningReporter).toHaveBeenCalledWith({
      report: expect.any(Function),
    });
    expect(mockWithContextModule).toHaveBeenCalledWith(mockContextModule);

    const blindSigningReporter = mockSetBlindSigningReporter.mock.calls[0][0];
    await expect(blindSigningReporter.report()).resolves.toBeUndefined();

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

  it('reconnects when the first address lookup after opening Ethereum loses the session', async () => {
    const keyring = new LedgerBridgeKeyring();
    const connectionOpeningError = {
      _tag: 'ConnectionOpeningError',
      originalError: new Error('Failed to open the device.'),
    };
    mockConnect
      .mockResolvedValueOnce('session-1')
      .mockResolvedValueOnce('session-2');
    mockGetAddress
      .mockReturnValueOnce({
        observable: of({
          status: 'error',
          error: connectionOpeningError,
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

    try {
      await expect(keyring.unlock("m/44'/60'/0'/0/0")).resolves.toBe(
        '0x0000000000000000000000000000000000000001'
      );

      expect(mockDisconnect).toHaveBeenCalledWith({ sessionId: 'session-1' });
      expect(mockConnect).toHaveBeenCalledTimes(2);
    } finally {
      await keyring.cleanUp();
    }
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

  it('reconnects once when opening Ethereum temporarily resets WebHID', async () => {
    const keyring = new LedgerBridgeKeyring();
    const dashboardState = {
      ...connectedState,
      currentApp: {
        name: 'BOLOS',
        version: '1.0.0',
      },
    };
    const connectionOpeningErrorState = {
      status: 'error',
      error: {
        _tag: 'ConnectionOpeningError',
        originalError: new Error('Failed to open the device.'),
      },
    };

    mockConnect
      .mockResolvedValueOnce('session-1')
      .mockResolvedValueOnce('session-2');
    mockGetDeviceSessionState
      .mockReturnValueOnce(of(dashboardState))
      .mockReturnValueOnce(of(dashboardState))
      .mockReturnValue(of(connectedState));
    mockExecuteDeviceAction.mockReturnValueOnce({
      observable: of(connectionOpeningErrorState),
      cancel: jest.fn(),
    });

    try {
      await expect(keyring.unlock("m/44'/60'/0'/0/0")).resolves.toBe(
        '0x0000000000000000000000000000000000000001'
      );

      expect(mockConnect).toHaveBeenCalledTimes(2);
      expect(mockDisconnect).toHaveBeenCalledWith({ sessionId: 'session-1' });
      expect(mockExecuteDeviceAction).toHaveBeenCalledTimes(1);
    } finally {
      await keyring.cleanUp();
    }
  });

  it('stops after one connection-opening recovery attempt', async () => {
    const keyring = new LedgerBridgeKeyring();
    const dashboardState = {
      ...connectedState,
      currentApp: {
        name: 'BOLOS',
        version: '1.0.0',
      },
    };
    const connectionOpeningErrorState = {
      status: 'error',
      error: {
        _tag: 'ConnectionOpeningError',
        originalError: new Error('Failed to open the device.'),
      },
    };

    mockConnect
      .mockResolvedValueOnce('session-1')
      .mockResolvedValueOnce('session-2');
    mockGetDeviceSessionState.mockReturnValue(of(dashboardState));
    mockExecuteDeviceAction.mockReturnValue({
      observable: of(connectionOpeningErrorState),
      cancel: jest.fn(),
    });

    try {
      await expect(keyring.unlock("m/44'/60'/0'/0/0")).rejects.toThrow(
        'ConnectionOpeningError'
      );

      expect(mockConnect).toHaveBeenCalledTimes(2);
      expect(mockExecuteDeviceAction).toHaveBeenCalledTimes(2);
    } finally {
      await keyring.cleanUp();
    }
  });

  it('cancels a hanging device action on the offscreen Ledger disconnect event', async () => {
    const keyring = new LedgerBridgeKeyring();
    const cancel = jest.fn();
    const dashboardState = {
      ...connectedState,
      currentApp: {
        name: 'BOLOS',
        version: '1.0.0',
      },
    };
    const actionState$ = new Subject<any>();
    let rejection: Error | undefined;

    mockConnect.mockResolvedValueOnce('session-1');
    mockGetDeviceSessionState.mockReturnValue(of(dashboardState));
    mockExecuteDeviceAction.mockReturnValueOnce({
      observable: actionState$,
      cancel,
    });

    const operation = keyring.openEthApp().catch((error) => {
      rejection = error;
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mockExecuteDeviceAction).toHaveBeenCalledTimes(1);

    actionState$.next({
      status: 'pending',
      intermediateValue: {
        requiredUserInteraction: 'none',
      },
    });
    expect(mockRuntimeMessageListener).toBeDefined();
    mockRuntimeMessageListener!({
      target: 'extension-offscreen',
      event: 'ledger-device-disconnect',
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    const rejectionAfterDisconnect = rejection;
    if (!rejectionAfterDisconnect) {
      actionState$.error(new Error('test cleanup'));
    }
    await operation;

    expect(rejectionAfterDisconnect?.message).toBe(
      'Ledger: Device disconnected'
    );
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it('allows the user more than 30 seconds to open the Ethereum app', async () => {
    jest.useFakeTimers();
    const keyring = new LedgerBridgeKeyring();
    const cancel = jest.fn();
    const actionState$ = new Subject<any>();
    let settled = false;
    let rejection: Error | undefined;
    mockConnect.mockResolvedValueOnce('session-1');
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
      observable: actionState$,
      cancel,
    });

    const operation = keyring.openEthApp().then(
      () => {
        settled = true;
      },
      (error) => {
        settled = true;
        rejection = error;
      }
    );

    try {
      await waitForMockCall(mockExecuteDeviceAction);
      expect(mockExecuteDeviceAction).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(30001);
      await flushMicrotasks();

      expect(settled).toBe(false);
      expect(rejection).toBeUndefined();
      expect(cancel).not.toHaveBeenCalled();

      actionState$.next({
        status: 'completed',
        output: undefined,
      });
      await operation;
      expect(settled).toBe(true);
    } finally {
      actionState$.next({
        status: 'completed',
        output: undefined,
      });
      await keyring.cleanUp();
      jest.useRealTimers();
    }
  });

  it('allows a transaction review to take more than 60 seconds', async () => {
    jest.useFakeTimers();
    const address = '0x0000000000000000000000000000000000000001';
    const keyring = new LedgerBridgeKeyring({
      accounts: [address],
      accountDetails: {
        [address]: {
          hdPath: "m/44'/60'/0'/0/0",
        },
      },
    });
    const cancel = jest.fn();
    const actionState$ = new Subject<any>();
    const tx = {
      getChainId: () => Uint8Array.from([1]),
      serialize: () => Buffer.from('f86c', 'hex'),
      verifySignature: () => true,
    } as any;
    const signature = {
      v: 27,
      r: '1'.padStart(64, '0'),
      s: '2'.padStart(64, '0'),
    };
    let result: unknown;
    let rejection: Error | undefined;
    mockConnect.mockResolvedValueOnce('session-1');
    mockSignTransaction.mockReturnValueOnce({
      observable: actionState$,
      cancel,
    });

    const operation = keyring.signTransaction(address, tx).then(
      (value) => {
        result = value;
      },
      (error) => {
        rejection = error;
      }
    );

    try {
      await waitForMockCall(mockSignTransaction);
      expect(mockSignTransaction).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(60001);
      await flushMicrotasks();

      expect(result).toBeUndefined();
      expect(rejection).toBeUndefined();
      expect(cancel).not.toHaveBeenCalled();

      actionState$.next({
        status: 'completed',
        output: signature,
      });
      await operation;
      expect(result).toBe(tx);
    } finally {
      actionState$.next({
        status: 'completed',
        output: signature,
      });
      await keyring.cleanUp();
      actionState$.complete();
      jest.useRealTimers();
    }
  });

  it('cleans up after another client corrupts the signature response', async () => {
    const address = '0x0000000000000000000000000000000000000001';
    const keyring = new LedgerBridgeKeyring({
      accounts: [address],
      accountDetails: {
        [address]: {
          hdPath: "m/44'/60'/0'/0/0",
        },
      },
    });
    const cancel = jest.fn();
    const tx = {
      getChainId: () => Uint8Array.from([1]),
      serialize: () => Buffer.from('f86c', 'hex'),
    } as any;
    mockSignTransaction.mockReturnValueOnce({
      observable: of({
        status: 'error',
        error: {
          _tag: 'InvalidStatusWordError',
          originalError: new Error('R is missing'),
        },
      }),
      cancel,
    });

    try {
      await expect(keyring.signTransaction(address, tx)).rejects.toThrow(
        'Ledger: Device communication was interrupted. Close other apps using Ledger and try again.'
      );
      expect(cancel).toHaveBeenCalledTimes(1);
      expect(mockDisconnect).toHaveBeenCalledWith({ sessionId: 'session-1' });
    } finally {
      await keyring.cleanUp();
    }
  });

  it('rejects immediately when the Ledger action requires device unlock', async () => {
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
      observable: of({
        status: 'pending',
        intermediateValue: {
          requiredUserInteraction: 'unlock-device',
        },
      }),
      cancel,
    });

    try {
      await expect(keyring.openEthApp()).rejects.toThrow(
        'Ledger: Device is locked 0x5515'
      );
      expect(cancel).toHaveBeenCalledTimes(1);
    } finally {
      await keyring.cleanUp();
    }
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
