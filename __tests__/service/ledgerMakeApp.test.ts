import { BehaviorSubject, of, Subject } from 'rxjs';

const mockListenToAvailableDevices = jest.fn();
const mockConnect = jest.fn();
const mockDisconnect = jest.fn();
const mockGetDeviceSessionState = jest.fn();
const mockExecuteDeviceAction = jest.fn();
const mockGetAddress = jest.fn();
const mockSignTransaction = jest.fn();
const mockSendCommand = jest.fn();
const mockGetContexts = jest.fn();
// build() hands back a fresh module per call, as the real builder does.
const mockGetTypedDataFilters = jest.fn();
const buildMockContextModule = () => ({
  clearSigning: true,
  getContexts: mockGetContexts,
  getTypedDataFilters: mockGetTypedDataFilters,
});
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

const waitForMockCall = async (mock: jest.Mock, count = 1) => {
  for (let i = 0; i < 100 && mock.mock.calls.length < count; i++) {
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
      None: 'none',
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
        sendCommand: mockSendCommand,
      })),
    })),
    CloseAppCommand: jest.fn(),
    GetAppAndVersionCommand: jest.fn(),
    OpenAppDeviceAction: jest.fn(),
    // Mirrors the real predicate so command results are actually exercised.
    isSuccessCommandResult: (result: any) => !!result && 'data' in result,
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
    ClearSignContextType: {
      ERROR: 'error',
    },
    ContextModuleChainID: {
      Ethereum: 'ethereum',
    },
    ContextModuleBuilder: jest.fn().mockImplementation(() => ({
      removeDefaultLoaders: mockRemoveDefaultLoaders.mockReturnThis(),
      addTypedDataLoader: mockAddTypedDataLoader.mockReturnThis(),
      setChain: mockSetChain.mockReturnThis(),
      setBlindSigningReporter: mockSetBlindSigningReporter.mockReturnThis(),
      build: mockContextModuleBuild.mockImplementation(buildMockContextModule),
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
    mockGetContexts.mockResolvedValue([]);
    mockGetTypedDataFilters.mockResolvedValue({ type: 'success' });
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
    expect(mockWithContextModule).toHaveBeenCalledWith(
      expect.objectContaining({
        clearSigning: true,
        getContexts: expect.any(Function),
      })
    );

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

  // The thrown message is the whole error chain flattened, so every nested
  // code appears in the same 0x shape as the real status word. The keyring
  // reads the field instead, walking past its own toLedgerError wrapper.
  it('reports the status word carried by a wrapped device failure', async () => {
    const address = '0x0000000000000000000000000000000000000001';
    const keyring = new LedgerBridgeKeyring({
      accounts: [address],
      accountDetails: { [address]: { hdPath: "m/44'/60'/0'/0/0" } },
    });
    const tx = {
      getChainId: () => Uint8Array.from([1]),
      serialize: () => Buffer.from('f86c', 'hex'),
    } as any;
    mockSignTransaction.mockReturnValueOnce({
      observable: of({
        status: 'error',
        error: {
          _tag: 'EthAppCommandError',
          errorCode: '6a80',
          message: 'Invalid data 0x6a80',
          // A later hex run that a text scan would pick instead.
          originalError: { name: 'TransportError', errorCode: 0x5515 },
        },
      }),
      cancel: jest.fn(),
    });

    try {
      const failure = await keyring
        .signTransaction(address, tx)
        .catch((e: Error) => e);

      expect(keyring.getHardwareSigningMetadata(failure).status_word).toBe(
        '6a80'
      );
      expect(keyring.getHardwareSigningMetadata(failure)).toMatchObject({
        ledger_action: 'signTx',
        ledger_action_status: 'error',
      });
    } finally {
      await keyring.cleanUp();
    }
  });

  it('reports a stopped device action without rewriting it to error', async () => {
    const address = '0x0000000000000000000000000000000000000001';
    const keyring = new LedgerBridgeKeyring({
      accounts: [address],
      accountDetails: { [address]: { hdPath: "m/44'/60'/0'/0/0" } },
    });
    const tx = {
      getChainId: () => Uint8Array.from([1]),
      serialize: () => Buffer.from('f86c', 'hex'),
    } as any;
    mockSignTransaction.mockReturnValueOnce({
      observable: of({ status: 'stopped' }),
      cancel: jest.fn(),
    });

    try {
      const failure = await keyring
        .signTransaction(address, tx)
        .catch((e: Error) => e);

      expect(keyring.getHardwareSigningMetadata(failure)).toMatchObject({
        ledger_action: 'signTx',
        ledger_action_status: 'stopped',
      });
    } finally {
      await keyring.cleanUp();
    }
  });

  it('keeps overlapping account discovery steps out of a pending signing trace', async () => {
    const address = '0x0000000000000000000000000000000000000001';
    const keyring = new LedgerBridgeKeyring({
      accounts: [address],
      accountDetails: {
        [address]: {
          hdPath: "m/44'/60'/0'/0/0",
          hdPathBasePublicKey: 'public-key',
          hdPathType: 'Legacy',
        },
      },
    });
    const tx = {
      getChainId: () => Uint8Array.from([1]),
      serialize: () => Buffer.from('f86c', 'hex'),
    } as any;
    const signing$ = new Subject<any>();
    const discovery$ = new Subject<any>();
    const completedAddress = {
      status: 'completed',
      output: { address, publicKey: 'public-key' },
    };
    mockConnect.mockResolvedValueOnce('session-1');
    mockGetAddress
      .mockReturnValueOnce({
        observable: of(completedAddress),
        cancel: jest.fn(),
      })
      .mockReturnValueOnce({
        observable: discovery$,
        cancel: jest.fn(),
      })
      .mockReturnValueOnce({
        observable: of(
          {
            status: 'pending',
            intermediateValue: {
              step: 'signer.eth.steps.accountDiscovery',
              requiredUserInteraction: 'none',
            },
          },
          completedAddress
        ),
        cancel: jest.fn(),
      });
    mockSignTransaction.mockReturnValueOnce({
      observable: signing$,
      cancel: jest.fn(),
    });

    try {
      const signing = keyring
        .signTransaction(address, tx)
        .catch((error: Error) => error);
      await waitForMockCall(mockSignTransaction);

      signing$.next({
        status: 'pending',
        intermediateValue: {
          step: 'signer.eth.steps.signTransaction',
          requiredUserInteraction: 'sign-transaction',
        },
      });

      // Both calls share their first address lookup. The shorter one finishes
      // first; a global trace toggle would then restore the signing trace while
      // the longer discovery starts its second lookup.
      const firstDiscovery = keyring.getAddresses(0, 1);
      const secondDiscovery = keyring.getAddresses(0, 2);
      await waitForMockCall(mockGetAddress, 2);
      discovery$.next(completedAddress);
      await Promise.all([firstDiscovery, secondDiscovery]);
      signing$.next({
        status: 'error',
        error: { _tag: 'EthAppCommandError', errorCode: '6a80' },
      });

      const steps = keyring.getHardwareSigningMetadata(await signing)
        .device_action_steps;
      expect(steps).toContain('signTransaction');
      expect(steps).not.toContain('accountDiscovery');
    } finally {
      discovery$.complete();
      signing$.complete();
      await keyring.cleanUp();
    }
  });

  it('keeps signing successful when diagnostic stage logging throws', async () => {
    const address = '0x0000000000000000000000000000000000000001';
    const keyring = new LedgerBridgeKeyring({
      accounts: [address],
      accountDetails: { [address]: { hdPath: "m/44'/60'/0'/0/0" } },
    });
    const tx = {
      getChainId: () => Uint8Array.from([1]),
      serialize: () => Buffer.from('f86c', 'hex'),
      verifySignature: () => true,
    } as any;
    const signing$ = new Subject<any>();
    const signature = {
      v: 27,
      r: '1'.padStart(64, '0'),
      s: '2'.padStart(64, '0'),
    };
    const debug = jest.spyOn(console, 'debug').mockImplementation(() => {
      throw new Error('diagnostic failure');
    });
    mockConnect.mockResolvedValueOnce('session-1');
    const cancel = jest.fn();
    mockSignTransaction.mockReturnValueOnce({
      observable: signing$,
      cancel,
    });

    try {
      const signing = keyring.signTransaction(address, tx);
      await waitForMockCall(mockSignTransaction);
      signing$.next({
        status: 'pending',
        intermediateValue: {
          step: 'signer.eth.steps.signTransaction',
          requiredUserInteraction: 'sign-transaction',
        },
      });
      signing$.next({ status: 'completed', output: signature });

      await expect(signing).resolves.toBe(tx);
      expect(cancel).not.toHaveBeenCalled();
    } finally {
      debug.mockRestore();
      signing$.complete();
      await keyring.cleanUp();
    }
  });

  it('preserves the device failure when diagnostic stage logging throws', async () => {
    const address = '0x0000000000000000000000000000000000000001';
    const keyring = new LedgerBridgeKeyring({
      accounts: [address],
      accountDetails: { [address]: { hdPath: "m/44'/60'/0'/0/0" } },
    });
    const tx = {
      getChainId: () => Uint8Array.from([1]),
      serialize: () => Buffer.from('f86c', 'hex'),
    } as any;
    const signing$ = new Subject<any>();
    const deviceError = { _tag: 'EthAppCommandError', errorCode: '6a80' };
    const debug = jest.spyOn(console, 'debug').mockImplementation(() => {
      throw new Error('diagnostic failure');
    });
    mockConnect.mockResolvedValueOnce('session-1');
    mockSignTransaction.mockReturnValueOnce({
      observable: signing$,
      cancel: jest.fn(),
    });

    try {
      const signing = keyring
        .signTransaction(address, tx)
        .catch((error: Error) => error);
      await waitForMockCall(mockSignTransaction);
      signing$.next({
        status: 'pending',
        intermediateValue: {
          step: 'signer.eth.steps.signTransaction',
          requiredUserInteraction: 'sign-transaction',
        },
      });
      signing$.next({ status: 'error', error: deviceError });

      const failure = await signing;
      expect(failure.message).toContain('0x6a80');
      expect((failure as any).cause?.cause).toBe(deviceError);
    } finally {
      debug.mockRestore();
      signing$.complete();
      await keyring.cleanUp();
    }
  });

  it('keeps signing successful when diagnostic timing throws', async () => {
    const address = '0x0000000000000000000000000000000000000001';
    const keyring = new LedgerBridgeKeyring({
      accounts: [address],
      accountDetails: { [address]: { hdPath: "m/44'/60'/0'/0/0" } },
    });
    const tx = {
      getChainId: () => Uint8Array.from([1]),
      serialize: () => Buffer.from('f86c', 'hex'),
      verifySignature: () => true,
    } as any;
    const cancel = jest.fn();
    const timing = jest.spyOn(performance, 'now').mockImplementation(() => {
      throw new Error('diagnostic timing failure');
    });
    mockConnect.mockResolvedValueOnce('session-1');
    mockSignTransaction.mockReturnValueOnce({
      observable: of({
        status: 'completed',
        output: {
          v: 27,
          r: '1'.padStart(64, '0'),
          s: '2'.padStart(64, '0'),
        },
      }),
      cancel,
    });

    try {
      await expect(keyring.signTransaction(address, tx)).resolves.toBe(tx);
      expect(cancel).not.toHaveBeenCalled();
      await keyring.cleanUp();
      expect(mockDisconnect).toHaveBeenCalledWith({ sessionId: 'session-1' });
    } finally {
      timing.mockRestore();
      await keyring.cleanUp();
    }
  });

  it('still disconnects and preserves recovery when teardown tracing throws', async () => {
    const address = '0x0000000000000000000000000000000000000001';
    const keyring = new LedgerBridgeKeyring({
      accounts: [address],
      accountDetails: { [address]: { hdPath: "m/44'/60'/0'/0/0" } },
    });
    const tx = {
      getChainId: () => Uint8Array.from([1]),
      serialize: () => Buffer.from('f86c', 'hex'),
    } as any;
    const signing$ = new Subject<any>();
    const cancel = jest.fn();
    mockConnect.mockResolvedValueOnce('session-1');
    mockSignTransaction.mockReturnValueOnce({ observable: signing$, cancel });
    const signing = keyring
      .signTransaction(address, tx)
      .catch((error: Error) => error);
    await waitForMockCall(mockSignTransaction);
    const timing = jest.spyOn(performance, 'now').mockImplementation(() => {
      throw new Error('diagnostic teardown failure');
    });

    try {
      signing$.next({
        status: 'error',
        error: {
          _tag: 'InvalidStatusWordError',
          originalError: new Error('R is missing'),
        },
      });

      await expect(signing).resolves.toMatchObject({
        message:
          'Ledger: Device communication was interrupted. Close other apps using Ledger and try again.',
      });
      expect(cancel).toHaveBeenCalledTimes(1);
      expect(mockDisconnect).toHaveBeenCalledWith({ sessionId: 'session-1' });
    } finally {
      timing.mockRestore();
      signing$.complete();
      await keyring.cleanUp();
    }
  });

  // Attribution across overlapping attempts is best effort: an attempt reaches
  // its first device action several awaits after it begins, so a Resend can
  // take over recording before the earlier attempt has emitted anything. What
  // must hold is that neither trace is readable as an exact account of one
  // attempt, and that the status word stays with the attempt that carried it.
  it('marks both traces when a Resend overlaps a pending attempt', async () => {
    const address = '0x0000000000000000000000000000000000000001';
    const keyring = new LedgerBridgeKeyring({
      accounts: [address],
      accountDetails: { [address]: { hdPath: "m/44'/60'/0'/0/0" } },
    });
    const tx = {
      getChainId: () => Uint8Array.from([1]),
      serialize: () => Buffer.from('f86c', 'hex'),
    } as any;
    const first$ = new Subject<any>();
    const second$ = new Subject<any>();
    mockSignTransaction
      .mockReturnValueOnce({ observable: first$, cancel: jest.fn() })
      .mockReturnValueOnce({ observable: second$, cancel: jest.fn() });

    try {
      const first = keyring.signTransaction(address, tx).catch((e: Error) => e);
      // Resend, while the first attempt has not settled.
      const second = keyring
        .signTransaction(address, tx)
        .catch((e: Error) => e);
      for (
        let i = 0;
        i < 50 && mockSignTransaction.mock.calls.length < 2;
        i++
      ) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      expect(mockSignTransaction).toHaveBeenCalledTimes(2);

      first$.next({
        status: 'error',
        error: { _tag: 'EthAppCommandError', errorCode: '6a80' },
      });
      second$.next({
        status: 'error',
        error: { _tag: 'EthAppCommandError', errorCode: '6d00' },
      });

      const firstTrace = keyring.getHardwareSigningMetadata(await first);
      const secondTrace = keyring.getHardwareSigningMetadata(await second);

      // Each attempt keeps its own status word — that part is exact, because
      // it is read off the failure rather than off shared state.
      expect(firstTrace.status_word).toBe('6a80');
      expect(secondTrace.status_word).toBe('6d00');

      // Neither trace may be read as a clean single-attempt account.
      expect(firstTrace.device_action_steps).toContain('overlappingAttempt');
      expect(secondTrace.device_action_steps).toContain('overlappingAttempt');
    } finally {
      first$.complete();
      second$.complete();
      await keyring.cleanUp();
    }
  });

  it('keeps each trace when overlapping attempts share a failing unlock', async () => {
    const address = '0x0000000000000000000000000000000000000001';
    const keyring = new LedgerBridgeKeyring({
      accounts: [address],
      accountDetails: { [address]: { hdPath: "m/44'/60'/0'/0/0" } },
    });
    const tx = {
      getChainId: () => Uint8Array.from([1]),
      serialize: () => Buffer.from('f86c', 'hex'),
    } as any;
    const address$ = new Subject<any>();
    mockConnect.mockResolvedValueOnce('session-1');
    mockGetAddress.mockReturnValueOnce({
      observable: address$,
      cancel: jest.fn(),
    });

    try {
      const first = keyring.signTransaction(address, tx).catch((e: Error) => e);
      await waitForMockCall(mockGetAddress);

      const second = keyring
        .signTransaction(address, tx)
        .catch((e: Error) => e);
      address$.next({
        status: 'error',
        error: { _tag: 'EthAppCommandError', errorCode: '6a80' },
      });

      const firstError = await first;
      const secondError = await second;
      const firstTrace = keyring.getHardwareSigningMetadata(firstError);
      const secondTrace = keyring.getHardwareSigningMetadata(secondError);

      expect(mockGetAddress).toHaveBeenCalledTimes(1);
      expect(firstError).not.toBe(secondError);
      expect(firstTrace.status_word).toBe('6a80');
      expect(secondTrace.status_word).toBe('6a80');
      expect(firstTrace.device_action_steps).toContain('overlappingAttempt');
      expect(secondTrace.device_action_steps).toContain('overlappingAttempt');
    } finally {
      address$.complete();
      await keyring.cleanUp();
    }
  });

  // A long trace is exactly what makes a user reach for Resend, so the cap
  // must never swallow the declaration that the trace may be mixed.
  it('declares an overlap even on a trace that has hit its cap', async () => {
    const address = '0x0000000000000000000000000000000000000001';
    const keyring = new LedgerBridgeKeyring({
      accounts: [address],
      accountDetails: { [address]: { hdPath: "m/44'/60'/0'/0/0" } },
    });
    const tx = {
      getChainId: () => Uint8Array.from([1]),
      serialize: () => Buffer.from('f86c', 'hex'),
    } as any;
    const first$ = new Subject<any>();
    mockSignTransaction
      .mockReturnValueOnce({ observable: first$, cancel: jest.fn() })
      .mockReturnValueOnce({
        observable: of({
          status: 'error',
          error: { _tag: 'EthAppCommandError', errorCode: '6d00' },
        }),
        cancel: jest.fn(),
      });

    try {
      const first = keyring.signTransaction(address, tx).catch((e: Error) => e);
      for (
        let i = 0;
        i < 50 && mockSignTransaction.mock.calls.length < 1;
        i++
      ) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      // Well past MAX_DEVICE_ACTION_TRACE_STEPS.
      for (let i = 0; i < 60; i++) {
        first$.next({
          status: 'pending',
          intermediateValue: {
            step: `signer.eth.steps.step${i}`,
            requiredUserInteraction: 'none',
          },
        });
      }
      await flushMicrotasks();

      await keyring.signTransaction(address, tx).catch((e: Error) => e);
      first$.next({
        status: 'error',
        error: { _tag: 'EthAppCommandError', errorCode: '6a80' },
      });

      const steps = keyring.getHardwareSigningMetadata(await first)
        .device_action_steps;
      expect(steps).toContain('truncated');
      expect(steps).toContain('overlappingAttempt');
    } finally {
      first$.complete();
      await keyring.cleanUp();
    }
  });

  // UserInteractionRequired.None is the common case and must not be rendered,
  // or every step carries a meaningless suffix.
  it('omits the interaction suffix when the device wants nothing', async () => {
    const address = '0x0000000000000000000000000000000000000001';
    const keyring = new LedgerBridgeKeyring({
      accounts: [address],
      accountDetails: { [address]: { hdPath: "m/44'/60'/0'/0/0" } },
    });
    const tx = {
      getChainId: () => Uint8Array.from([1]),
      serialize: () => Buffer.from('f86c', 'hex'),
    } as any;
    const stream = new Subject<any>();
    mockSignTransaction.mockReturnValueOnce({
      observable: stream,
      cancel: jest.fn(),
    });
    mockConnect.mockResolvedValueOnce('session-1');

    try {
      const attempt = keyring
        .signTransaction(address, tx)
        .catch((e: Error) => e);
      for (
        let i = 0;
        i < 50 && mockSignTransaction.mock.calls.length < 1;
        i++
      ) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      stream.next({
        status: 'pending',
        intermediateValue: {
          step: 'signer.eth.steps.buildContexts',
          requiredUserInteraction: 'none',
        },
      });
      stream.next({
        status: 'pending',
        intermediateValue: {
          step: 'signer.eth.steps.signTransaction',
          requiredUserInteraction: 'sign-transaction',
        },
      });
      stream.next({
        status: 'error',
        error: { _tag: 'EthAppCommandError', errorCode: '6a80' },
      });

      const steps = keyring.getHardwareSigningMetadata(await attempt)
        .device_action_steps;

      expect(steps).toContain('buildContexts@');
      expect(steps).not.toContain('buildContexts(none)');
      expect(steps).toContain('signTransaction(sign-transaction)@');
    } finally {
      stream.complete();
      await keyring.cleanUp();
    }
  });

  it('flags a slow clear-signing context gap for Sentry filtering', async () => {
    const address = '0x0000000000000000000000000000000000000001';
    const keyring = new LedgerBridgeKeyring({
      accounts: [address],
      accountDetails: { [address]: { hdPath: "m/44'/60'/0'/0/0" } },
    });
    const tx = {
      getChainId: () => Uint8Array.from([1]),
      serialize: () => Buffer.from('f86c', 'hex'),
    } as any;
    const stream = new Subject<any>();
    let now = 0;
    const timing = jest.spyOn(performance, 'now').mockImplementation(() => now);
    mockSignTransaction.mockReturnValueOnce({
      observable: stream,
      cancel: jest.fn(),
    });
    mockConnect.mockResolvedValueOnce('session-1');

    try {
      const attempt = keyring
        .signTransaction(address, tx)
        .catch((e: Error) => e);
      await waitForMockCall(mockSignTransaction);
      await flushMicrotasks();

      now = 100;
      stream.next({
        status: 'pending',
        intermediateValue: {
          step: 'signer.eth.steps.buildContexts',
          requiredUserInteraction: 'none',
        },
      });
      now = 5100;
      stream.next({
        status: 'pending',
        intermediateValue: {
          step: 'signer.eth.steps.provideContexts',
          requiredUserInteraction: 'none',
        },
      });
      stream.next({
        status: 'error',
        error: { _tag: 'EthAppCommandError', errorCode: '6a80' },
      });

      expect(
        keyring.getHardwareSigningMetadata(await attempt)
          .ledger_clear_signing_timeout_suspected
      ).toBe(true);
    } finally {
      timing.mockRestore();
      stream.complete();
      await keyring.cleanUp();
    }
  });

  // The shape check must reject a malformed top-level code and keep walking,
  // not give up: the real word can sit one level down.
  it('walks past a malformed code to the real status word', async () => {
    const address = '0x0000000000000000000000000000000000000001';
    const keyring = new LedgerBridgeKeyring({
      accounts: [address],
      accountDetails: { [address]: { hdPath: "m/44'/60'/0'/0/0" } },
    });
    const tx = {
      getChainId: () => Uint8Array.from([1]),
      serialize: () => Buffer.from('f86c', 'hex'),
    } as any;
    mockSignTransaction.mockReturnValueOnce({
      observable: of({
        status: 'error',
        error: {
          _tag: 'EthAppCommandError',
          errorCode: 'not-a-status-word',
          cause: { _tag: 'EthAppCommandError', errorCode: '6a80' },
        },
      }),
      cancel: jest.fn(),
    });

    try {
      const failure = await keyring
        .signTransaction(address, tx)
        .catch((e: Error) => e);

      expect(keyring.getHardwareSigningMetadata(failure).status_word).toBe(
        '6a80'
      );
    } finally {
      await keyring.cleanUp();
    }
  });

  // The device error sits below two toLedgerError wrappers already, so the
  // cause budget must have room left over rather than ending exactly there.
  it('still finds the status word under a deeper wrapping', async () => {
    const address = '0x0000000000000000000000000000000000000001';
    const keyring = new LedgerBridgeKeyring({
      accounts: [address],
      accountDetails: { [address]: { hdPath: "m/44'/60'/0'/0/0" } },
    });
    const tx = {
      getChainId: () => Uint8Array.from([1]),
      serialize: () => Buffer.from('f86c', 'hex'),
    } as any;
    mockSignTransaction.mockReturnValueOnce({
      observable: of({
        status: 'error',
        error: {
          _tag: 'EthAppCommandError',
          cause: {
            _tag: 'EthAppCommandError',
            errorCode: 'not-a-status-word',
            cause: { _tag: 'EthAppCommandError', errorCode: '6a80' },
          },
        },
      }),
      cancel: jest.fn(),
    });

    try {
      const failure = await keyring
        .signTransaction(address, tx)
        .catch((e: Error) => e);

      expect(keyring.getHardwareSigningMetadata(failure).status_word).toBe(
        '6a80'
      );
    } finally {
      await keyring.cleanUp();
    }
  });

  // Snapshotted at attempt start, and specifically "this session had already
  // done work", not "a session existed" — the session is opened before the
  // approval screen, so the weaker reading would be true of every signature.
  it('reports session_reused from work done before the attempt began', async () => {
    const address = '0x0000000000000000000000000000000000000001';
    const keyring = new LedgerBridgeKeyring({
      accounts: [address],
      accountDetails: { [address]: { hdPath: "m/44'/60'/0'/0/0" } },
    });
    const tx = {
      getChainId: () => Uint8Array.from([1]),
      serialize: () => Buffer.from('f86c', 'hex'),
    } as any;
    const failing = () => ({
      observable: of({
        status: 'error',
        error: { _tag: 'EthAppCommandError', errorCode: '6a80' },
      }),
      cancel: jest.fn(),
    });
    mockSignTransaction.mockReturnValueOnce(failing());

    try {
      // First signature on a session that has run nothing yet.
      const first = await keyring
        .signTransaction(address, tx)
        .catch((e: Error) => e);
      expect(keyring.getHardwareSigningMetadata(first).session_reused).toBe(
        false
      );

      // Same session, now with device actions behind it.
      mockSignTransaction.mockReturnValueOnce(failing());
      const second = await keyring
        .signTransaction(address, tx)
        .catch((e: Error) => e);
      expect(keyring.getHardwareSigningMetadata(second).session_reused).toBe(
        true
      );
    } finally {
      await keyring.cleanUp();
    }
  });

  // makeApp shares one session-open across concurrent callers. When that open
  // fails, every caller must get its own failure object, or two attempts
  // overwrite each other in the trace WeakMap and one report carries the
  // other's trace. Exercised directly: through the signing methods this is
  // shadowed by unlock(), which already clones.
  it('gives each caller its own failure when a shared session open fails', async () => {
    const keyring = new LedgerBridgeKeyring();
    mockListenToAvailableDevices.mockReturnValue(of([], []));

    const [first, second] = await Promise.all([
      keyring.makeApp().catch((e: Error) => e),
      keyring.makeApp().catch((e: Error) => e),
    ]);

    expect((first as Error).message).toContain('No connected Ledger device');
    expect((second as Error).message).toContain('No connected Ledger device');
    // Distinct objects, so traceByError can key each attempt separately.
    expect(first).not.toBe(second);
  });

  // A context set that comes back fast but incomplete is otherwise
  // indistinguishable from a failure unrelated to Clear Signing.
  it('counts Clear Signing contexts that came back as errors', async () => {
    const address = '0x0000000000000000000000000000000000000001';
    const keyring = new LedgerBridgeKeyring({
      accounts: [address],
      accountDetails: { [address]: { hdPath: "m/44'/60'/0'/0/0" } },
    });
    const tx = {
      getChainId: () => Uint8Array.from([1]),
      serialize: () => Buffer.from('f86c', 'hex'),
    } as any;
    mockGetContexts.mockResolvedValue([
      { type: 'ethereumToken', payload: 'ok' },
      { type: 'error', error: new Error('CAL unavailable') },
      { type: 'error', error: new Error('CAL unavailable') },
    ]);
    mockSignTransaction.mockReturnValueOnce({
      observable: of({
        status: 'error',
        error: { _tag: 'EthAppCommandError', errorCode: '6a80' },
      }),
      cancel: jest.fn(),
    });

    try {
      const failure = await keyring
        .signTransaction(address, tx)
        .catch((e: Error) => e);
      // The last module built is the one the signing attempt owns; earlier
      // ones come from session setup and carry no trace.
      const calls = mockWithContextModule.mock.calls;
      const contextModule = calls[calls.length - 1][0];
      await contextModule.getContexts({ to: '0x1' });

      const metadata = keyring.getHardwareSigningMetadata(failure);
      expect(metadata.ledger_context_error_count).toBe(2);
      expect(metadata.ledger_context_count).toBe(3);
    } finally {
      await keyring.cleanUp();
    }
  });

  // The whole safety argument for this wrapper: the device is sent exactly
  // what the module returned, so counting cannot change a signature.
  it('hands back the context set untouched', async () => {
    const keyring = new LedgerBridgeKeyring();
    const contexts = [
      { type: 'ethereumToken', payload: 'a' },
      { type: 'error', error: new Error('x') },
    ];
    mockGetContexts.mockResolvedValue(contexts);

    try {
      await keyring.unlock("m/44'/60'/0'/0/0");
      const contextModule = mockWithContextModule.mock.calls[0][0];

      // Same object, not merely equal: nothing filtered, reordered or copied.
      await expect(contextModule.getContexts({ to: '0x1' })).resolves.toBe(
        contexts
      );
    } finally {
      await keyring.cleanUp();
    }
  });

  it('returns the contexts even if counting throws', async () => {
    const keyring = new LedgerBridgeKeyring();
    // A context whose `type` getter throws, so the count blows up mid-filter.
    const hostile = [
      {
        get type(): string {
          throw new Error('hostile context');
        },
      },
    ];
    mockGetContexts.mockResolvedValue(hostile);

    try {
      await keyring.unlock("m/44'/60'/0'/0/0");
      const contextModule = mockWithContextModule.mock.calls[0][0];

      await expect(contextModule.getContexts({ to: '0x1' })).resolves.toBe(
        hostile
      );
    } finally {
      await keyring.cleanUp();
    }
  });

  // EIP-712 fetches through both getContexts and getTypedDataFilters, so
  // counting only the former would under-report the typed-data path.
  it('counts a failed typed-data filter fetch', async () => {
    const keyring = new LedgerBridgeKeyring();
    const failed = { type: 'error', error: new Error('CAL unavailable') };
    mockGetTypedDataFilters.mockResolvedValue(failed);

    try {
      await keyring.unlock("m/44'/60'/0'/0/0");
      const calls = mockWithContextModule.mock.calls;
      const contextModule = calls[calls.length - 1][0];

      // Handed back untouched, same object.
      await expect(
        contextModule.getTypedDataFilters({ domain: {} })
      ).resolves.toBe(failed);
    } finally {
      await keyring.cleanUp();
    }
  });

  it('reports a session age only while a session is open', async () => {
    const keyring = new LedgerBridgeKeyring();

    expect(keyring.getHardwareSigningMetadata().session_age_ms).toBeUndefined();

    await keyring.unlock("m/44'/60'/0'/0/0");

    const live = keyring.getHardwareSigningMetadata();
    expect(live.session_age_ms).toEqual(expect.any(Number));
    expect(live.session_action_count).toBeGreaterThanOrEqual(1);

    await keyring.cleanUp();

    // A closed session must stop reporting an age, or a later failure that
    // never opened one would carry a stale age next to session_reused: false.
    // The count goes with it: 0 next to no age reads as a real measurement.
    const closed = keyring.getHardwareSigningMetadata();
    expect(closed.session_age_ms).toBeUndefined();
    expect(closed.session_action_count).toBeUndefined();
  });

  it('records the failed session reading when a signing operation tears the session down', async () => {
    const address = '0x0000000000000000000000000000000000000001';
    const keyring = new LedgerBridgeKeyring({
      accounts: [address],
      accountDetails: { [address]: { hdPath: "m/44'/60'/0'/0/0" } },
    });
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
      cancel: jest.fn(),
    });

    try {
      const failure = await keyring
        .signTransaction(address, tx)
        .catch((e: Error) => e);

      // Reconnecting resets sessionCreatedAt and sessionActionCount, so the
      // reading for the session that actually failed only survives here.
      expect(
        keyring.getHardwareSigningMetadata(failure).device_action_steps
      ).toMatch(/sessionClosed\(age=\d+ms,actions=\d+\)@\d+ms/);
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
