import 'reflect-metadata';

// Perps invite (the only caller of sendRequest's approvalRequestId/onApproval
// option) must never let its inline SignTypedData request queue behind
// another pending approval or carry consent across an unlock. These two
// guards in rpcFlow.ts are what enforce that; this test exercises the real
// flow (not a copy of its logic) against a minimal stand-in controller.

const state = {
  isUnlocked: true,
  currentApproval: null as { id: string } | null,
  hasPermission: true,
};

const mockKeyringService = {
  memStore: { getState: () => ({ isUnlocked: state.isUnlocked }) },
  isUnlocked: () => state.isUnlocked,
};
const mockNotificationService = {
  getApproval: jest.fn(() => state.currentApproval),
  requestApproval: jest.fn(async (..._args: any[]) => ({} as any)),
  setCurrentRequestDeferFn: jest.fn(),
  unLock: jest.fn(),
};
const mockPermissionService = {
  hasPermission: jest.fn(() => state.hasPermission),
  getConnectedSite: jest.fn(() => undefined),
  addConnectedSiteV2: jest.fn(),
  updateConnectSite: jest.fn(),
  touchConnectedSite: jest.fn(),
};
const mockPreferenceService = {
  getPreference: jest.fn(),
  setCurrentAccount: jest.fn(),
  getCurrentAccount: jest.fn(),
};

jest.mock('background/service', () => ({
  keyringService: mockKeyringService,
  notificationService: mockNotificationService,
  permissionService: mockPermissionService,
  preferenceService: mockPreferenceService,
}));

// A minimal stand-in for the real ~2000-line providerController: just one
// APPROVAL-decorated method shaped like the real ethSignTypedDataV4 (see
// controller.ts), enough to drive rpcFlow's real middleware chain without
// importing the full controller and its heavy transaction/keyring surface.
const ethSignTypedDataV4 = jest.fn(
  async (_request?: any) => 'signature-result'
);
const fakeController = { ethSignTypedDataV4 };
Reflect.defineMetadata(
  'APPROVAL',
  ['SignTypedData', () => false],
  fakeController,
  'ethSignTypedDataV4'
);
jest.mock('@/background/controller/provider/controller', () => ({
  __esModule: true,
  default: fakeController,
}));

jest.mock('@/background/controller/provider/gnosisController', () => ({
  gnosisController: {},
}));
jest.mock('@/utils/transaction', () => ({
  buildSignTx: jest.fn(),
  normalizeTxParams: jest.fn((tx) => tx),
  shouldUpdateNonce: jest.fn(() => false),
}));
jest.mock('@/background/service/signTxPreparation', () => ({
  startSignTxPreparation: jest.fn(),
  getSignTxPreparationGas: jest.fn(),
  getSignTxPreparation: jest.fn(),
  cancelSignTxPreparation: jest.fn(),
  cancelAllSignTxPreparations: jest.fn(),
}));
jest.mock('@sentry/browser', () => ({ captureException: jest.fn() }));
jest.mock('@/eventBus', () => ({
  __esModule: true,
  default: {
    emit: jest.fn(),
    addEventListener: jest.fn(),
    once: jest.fn((_event, listener) => listener()),
  },
}));
jest.mock('consts', () => ({
  EVENTS: {
    broadcastToUI: 'broadcastToUI',
    SIGN_FINISHED: 'SIGN_FINISHED',
    SIGN_WAITING_AMOUNTED: 'SIGN_WAITING_AMOUNTED',
  },
  INTERNAL_REQUEST_ORIGIN: 'https://rabby.io',
  KEYRING_CLASS: { GnosisKeyring: 'Gnosis Safe' },
  KEYRING_TYPE: {
    GnosisKeyring: 'GnosisKeyring',
    CoboArgusKeyring: 'CoboArgusKeyring',
  },
  SUPPORT_1559_KEYRING_TYPE: [],
}));

import rpcFlow from '@/background/controller/provider/rpcFlow';
import eventBus from '@/eventBus';

const baseRequest = () => ({
  data: { method: 'eth_signTypedData_v4', params: [] },
  session: {
    origin: 'https://app.hyperliquid.xyz',
    name: 'Hyperliquid',
    icon: '',
  },
  account: { address: '0xaccount', type: 'SimpleKeyring' },
});

describe('rpcFlow: inline (onApproval) requests fail closed instead of queuing or crossing a session boundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    state.isUnlocked = true;
    state.currentApproval = null;
    state.hasPermission = true;
  });

  test('rejects immediately when the wallet is locked, never queues behind an Unlock approval', async () => {
    state.isUnlocked = false;
    await expect(
      rpcFlow({ ...baseRequest(), onApproval: jest.fn() } as any)
    ).rejects.toMatchObject({ message: 'Wallet is locked.' });
    expect(mockNotificationService.requestApproval).not.toHaveBeenCalled();
  });

  test('a normal (non-onApproval) dApp request still queues behind Unlock as usual when locked', async () => {
    state.isUnlocked = false;
    mockNotificationService.requestApproval.mockImplementationOnce(async () => {
      state.isUnlocked = true;
      return {};
    });
    await rpcFlow(baseRequest() as any).catch(() => undefined);
    expect(mockNotificationService.requestApproval).toHaveBeenCalledWith(
      expect.objectContaining({ approvalComponent: 'Unlock' }),
      expect.anything()
    );
  });

  test('rejects immediately when another approval is already current, never silently queues behind it', async () => {
    state.currentApproval = { id: 'someone-elses-approval' };
    await expect(
      rpcFlow({ ...baseRequest(), onApproval: jest.fn() } as any)
    ).rejects.toMatchObject({
      message: 'please request after current approval resolve',
    });
    expect(mockNotificationService.requestApproval).not.toHaveBeenCalled();
  });

  test('creates the approval and reports its ref via onApproval when nothing is queued and unlocked', async () => {
    const onApproval = jest.fn();
    mockNotificationService.requestApproval.mockImplementationOnce(
      async (_data, _winProps, options) => {
        const approval = { id: 'new-approval', component: 'SignTypedData' };
        options?.onCurrent?.(approval);
        return { signature: 'ignored' };
      }
    );
    await rpcFlow({ ...baseRequest(), onApproval } as any).catch(
      () => undefined
    );
    expect(onApproval).toHaveBeenCalledWith({
      id: 'new-approval',
      component: 'SignTypedData',
    });
  });

  test('a normal (non-onApproval) dApp request is unaffected by another pending approval — no new guard applies to it', async () => {
    state.currentApproval = { id: 'someone-elses-approval' };
    mockNotificationService.requestApproval.mockResolvedValueOnce({});
    await rpcFlow(baseRequest() as any).catch(() => undefined);
    expect(mockNotificationService.requestApproval).toHaveBeenCalled();
  });
});

describe('rpcFlow method dispatch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    state.isUnlocked = true;
    state.currentApproval = null;
    state.hasPermission = true;
  });

  test.each([
    'constructor',
    'toString',
    'valueOf',
    'hasOwnProperty',
    '__proto__',
  ])('rejects inherited property %s as method not found', async (method) => {
    const request = {
      ...baseRequest(),
      data: { method, params: [] },
    };

    await expect(rpcFlow(request as any)).rejects.toMatchObject({
      code: -32601,
    });
    expect(mockNotificationService.requestApproval).not.toHaveBeenCalled();
    expect(ethSignTypedDataV4).not.toHaveBeenCalled();
  });
});

describe('rpcFlow signing operation context', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    state.isUnlocked = true;
    state.currentApproval = null;
    state.hasPermission = true;
  });

  const getEmittedOperation = () => {
    const call = (eventBus.emit as jest.Mock).mock.calls.find(
      ([, payload]) => payload?.params?.signingOperation
    );
    return call?.[1]?.params?.signingOperation;
  };

  test('binds the completion event to the request origin, account and payload', async () => {
    mockNotificationService.requestApproval.mockResolvedValueOnce({});

    await rpcFlow(baseRequest() as any);

    expect(getEmittedOperation()).toMatchObject({
      origin: 'https://app.hyperliquid.xyz',
      accountAddress: '0xaccount',
      accountType: 'SimpleKeyring',
      id: expect.any(String),
      payloadHash: expect.stringMatching(/^0x[0-9a-f]{64}$/),
    });
  });

  test('preserves the inner Safe signing operation instead of replacing it with the outer dApp request', async () => {
    const safeOperation = {
      id: 'safe-operation',
      origin: 'https://safe.example',
      accountAddress: '0xowner',
      accountType: 'HD Key Tree',
      payloadHash: `0x${'ab'.repeat(32)}`,
    };
    mockNotificationService.requestApproval.mockResolvedValueOnce({
      signingOperation: safeOperation,
    });

    await rpcFlow(baseRequest() as any);

    expect(getEmittedOperation()).toBe(safeOperation);
  });

  test('passes the same operation to the waiting UI and completion event without changing the controller approval result', async () => {
    const approvalRes = {
      uiRequestComponent: 'PrivatekeyWaiting',
      $account: baseRequest().account,
    };
    mockNotificationService.requestApproval
      .mockResolvedValueOnce(approvalRes)
      .mockResolvedValueOnce('waiting-result');

    await expect(rpcFlow(baseRequest() as any)).resolves.toBe('waiting-result');

    const waitingApproval =
      mockNotificationService.requestApproval.mock.calls[1][0];
    expect(waitingApproval.params.signingOperation).toEqual(
      getEmittedOperation()
    );
    expect(waitingApproval.params.signingOperation).toBeDefined();
    expect(ethSignTypedDataV4.mock.calls[0][0].approvalRes).toBe(approvalRes);
  });
});
