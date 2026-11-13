import 'reflect-metadata';

// "Retry" in a waiting component calls resendSign(), which re-runs whatever
// notificationService.currentRequestDeferFn holds. Every provider request
// finishes in the same rpcFlow step, so a dapp polling eth_chainId while the
// user is still signing must not replace the signing it would retry. This
// drives the real flow against a minimal stand-in controller.

const mockNotificationService = {
  getApproval: jest.fn(() => null),
  requestApproval: jest.fn(async (..._args: any[]) => ({} as any)),
  setCurrentRequestDeferFn: jest.fn(),
  unLock: jest.fn(),
};

jest.mock('background/service', () => ({
  keyringService: {
    memStore: { getState: () => ({ isUnlocked: true }) },
    isUnlocked: () => true,
  },
  notificationService: mockNotificationService,
  permissionService: {
    hasPermission: jest.fn(() => true),
    getConnectedSite: jest.fn(() => undefined),
    updateConnectSite: jest.fn(),
    touchConnectedSite: jest.fn(),
  },
  preferenceService: {
    getPreference: jest.fn(),
    setCurrentAccount: jest.fn(),
    getCurrentAccount: jest.fn(),
  },
}));

const ethChainId = jest.fn(async () => '0x1');
const ethSignTypedDataV4 = jest.fn(async () => 'signature-result');
const fakeController = { ethChainId, ethSignTypedDataV4 };
Reflect.defineMetadata('SAFE', true, fakeController, 'ethChainId');
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
  cancelSignTxPreparation: jest.fn(),
}));
jest.mock('@/utils/signEvent', () => ({
  waitSignComponentAmounted: jest.fn(() => Promise.resolve()),
}));
jest.mock('@sentry/browser', () => ({ captureException: jest.fn() }));
jest.mock('@/eventBus', () => ({
  __esModule: true,
  default: { emit: jest.fn(), addEventListener: jest.fn() },
}));
jest.mock('consts', () => ({
  EVENTS: {},
  INTERNAL_REQUEST_ORIGIN: 'https://rabby.io',
  KEYRING_CLASS: {},
  KEYRING_TYPE: {
    GnosisKeyring: 'GnosisKeyring',
    CoboArgusKeyring: 'CoboArgusKeyring',
  },
  SUPPORT_1559_KEYRING_TYPE: [],
}));

import rpcFlow from '@/background/controller/provider/rpcFlow';

const request = (method: string) => ({
  data: { method, params: [] },
  session: { origin: 'https://dapp.example', name: 'Dapp', icon: '' },
  account: { address: '0xaccount', type: 'Ledger Hardware' },
});

// The first approval is the sign page handing off to a waiting component,
// the second is that waiting component settling.
const resolveSignPageWith = (approvalRes: Record<string, unknown>) => {
  mockNotificationService.requestApproval
    .mockResolvedValueOnce(approvalRes)
    .mockResolvedValueOnce('signature-result');
};

describe('rpcFlow: which request "Retry" re-runs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('a signing request that hands off to a waiting component becomes the retry target', async () => {
    resolveSignPageWith({ uiRequestComponent: 'LedgerHardwareWaiting' });
    await rpcFlow(request('eth_signTypedData_v4') as any);

    expect(
      mockNotificationService.setCurrentRequestDeferFn
    ).toHaveBeenCalledTimes(1);
    expect(ethSignTypedDataV4).toHaveBeenCalledTimes(1);

    const [retry] = mockNotificationService.setCurrentRequestDeferFn.mock
      .calls[0] as [(isRetry?: boolean) => Promise<unknown>];
    await retry(true);
    expect(ethSignTypedDataV4).toHaveBeenCalledTimes(2);
  });

  test('a request without a waiting component does not replace the retry target', async () => {
    await expect(rpcFlow(request('eth_chainId') as any)).resolves.toBe('0x1');

    expect(
      mockNotificationService.setCurrentRequestDeferFn
    ).not.toHaveBeenCalled();
  });

  test('Safe owner signing keeps the retry target it registered itself', async () => {
    resolveSignPageWith({
      uiRequestComponent: 'LedgerHardwareWaiting',
      isGnosis: true,
    });
    await rpcFlow(request('eth_signTypedData_v4') as any);

    expect(
      mockNotificationService.setCurrentRequestDeferFn
    ).not.toHaveBeenCalled();
    expect(ethSignTypedDataV4).not.toHaveBeenCalled();
  });
});
