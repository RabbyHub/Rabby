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
  setStatsData: jest.fn(),
  getStatsData: jest.fn(() => undefined),
  unLock: jest.fn(),
};
const mockPermissionService = {
  hasPermission: jest.fn(() => state.hasPermission),
  getConnectedSite: jest.fn(() => undefined),
  addConnectedSiteV2: jest.fn(),
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
const ethSignTypedDataV4 = jest.fn(async () => 'signature-result');
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
jest.mock('@/stats', () => ({
  __esModule: true,
  default: { report: jest.fn() },
}));
jest.mock('@/eventBus', () => ({
  __esModule: true,
  default: { emit: jest.fn(), addEventListener: jest.fn() },
}));
jest.mock('consts', () => ({
  EVENTS: {},
  INTERNAL_REQUEST_ORIGIN: 'https://rabby.io',
  KEYRING_CLASS: { GnosisKeyring: 'Gnosis Safe' },
  KEYRING_TYPE: {
    GnosisKeyring: 'GnosisKeyring',
    CoboArgusKeyring: 'CoboArgusKeyring',
  },
  SUPPORT_1559_KEYRING_TYPE: [],
}));

import rpcFlow from '@/background/controller/provider/rpcFlow';

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
