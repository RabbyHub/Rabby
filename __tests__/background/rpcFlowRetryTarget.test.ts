import 'reflect-metadata';

// "Retry" in a waiting component calls resendSign(), which re-runs whatever
// notificationService.currentRequestDeferFn holds. That slot is global, so:
//  - every provider request finishes in the same rpcFlow step, and a dapp
//    polling eth_chainId while the user is still signing must not replace the
//    signing it would retry;
//  - the slot re-runs an approved request, so it must not outlive the waiting
//    component it was registered for.
// This drives the real flow against a minimal stand-in controller.

type RetryTarget = (isRetry?: boolean) => Promise<unknown>;

const slot: { target?: RetryTarget } = {};

const mockNotificationService = {
  getApproval: jest.fn(() => null),
  requestApproval: jest.fn(async (..._args: any[]) => ({} as any)),
  setCurrentRequestDeferFn: jest.fn((fn: RetryTarget) => {
    slot.target = fn;
  }),
  clearCurrentRequestDeferFn: jest.fn(() => {
    slot.target = undefined;
  }),
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
  // rpcFlow also builds the signing operation with this module.
  ...jest.requireActual('@/utils/signEvent'),
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

// A signing request asks for two approvals: the sign page, which hands off to
// a waiting component, then that waiting component. `whileWaiting` runs while
// the waiting component is on screen, and decides how it settles.
const signWith = (
  approvalRes: Record<string, unknown>,
  whileWaiting: () => unknown = () => 'signature-result'
) => {
  mockNotificationService.requestApproval
    .mockResolvedValueOnce(approvalRes)
    .mockImplementationOnce(async () => whileWaiting());
  return rpcFlow(request('eth_signTypedData_v4') as any);
};

const ledgerHandoff = { uiRequestComponent: 'LedgerHardwareWaiting' };

describe('rpcFlow: which request "Retry" re-runs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    slot.target = undefined;
  });

  test('while its waiting component is on screen, a signing request is the retry target', async () => {
    let retried = false;
    await signWith(ledgerHandoff, async () => {
      expect(slot.target).toBeDefined();
      // The first attempt starts once the waiting component has mounted.
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(ethSignTypedDataV4).toHaveBeenCalledTimes(1);
      await slot.target!(true);
      retried = true;
      return 'signature-result';
    });

    expect(retried).toBe(true);
    expect(ethSignTypedDataV4).toHaveBeenCalledTimes(2);
  });

  test('a request without a waiting component does not replace the retry target', async () => {
    const signing = jest.fn();
    await signWith(ledgerHandoff, async () => {
      const target = slot.target;
      await expect(rpcFlow(request('eth_chainId') as any)).resolves.toBe('0x1');
      expect(slot.target).toBe(target);
      signing();
    });

    expect(signing).toHaveBeenCalled();
  });

  test('a request without a waiting component neither sets nor clears a target', async () => {
    await rpcFlow(request('eth_chainId') as any);

    expect(
      mockNotificationService.setCurrentRequestDeferFn
    ).not.toHaveBeenCalled();
    expect(
      mockNotificationService.clearCurrentRequestDeferFn
    ).not.toHaveBeenCalled();
  });

  test('a request rejected on the sign page never touches the target', async () => {
    mockNotificationService.requestApproval.mockRejectedValueOnce(
      new Error('User rejected the request.')
    );

    await expect(
      rpcFlow(request('eth_signTypedData_v4') as any)
    ).rejects.toThrow('User rejected the request.');
    expect(
      mockNotificationService.setCurrentRequestDeferFn
    ).not.toHaveBeenCalled();
    expect(
      mockNotificationService.clearCurrentRequestDeferFn
    ).not.toHaveBeenCalled();
  });

  describe('once the waiting component is gone, nothing is left to retry', () => {
    test('after it finishes', async () => {
      await signWith(ledgerHandoff);

      expect(slot.target).toBeUndefined();
    });

    test('after the user cancels it', async () => {
      await expect(
        signWith(ledgerHandoff, () => {
          throw new Error('user cancel');
        })
      ).rejects.toThrow('user cancel');

      expect(slot.target).toBeUndefined();
    });

    test('after a chain of waiting components', async () => {
      mockNotificationService.requestApproval
        .mockResolvedValueOnce(ledgerHandoff)
        .mockImplementationOnce(async () => {
          expect(slot.target).toBeDefined();
          return { uiRequestComponent: 'CommonWaiting' };
        })
        .mockImplementationOnce(async () => {
          expect(slot.target).toBeDefined();
          return 'signature-result';
        });
      await rpcFlow(request('eth_signTypedData_v4') as any);

      expect(mockNotificationService.requestApproval).toHaveBeenCalledTimes(3);
      expect(slot.target).toBeUndefined();
    });
  });

  describe('Safe owner signing registers its own retry target', () => {
    const safeHandoff = { ...ledgerHandoff, isGnosis: true };
    const safeTarget: RetryTarget = async () => undefined;

    test('rpcFlow keeps it while the waiting component is on screen', async () => {
      slot.target = safeTarget;
      await signWith(safeHandoff, () => {
        expect(slot.target).toBe(safeTarget);
      });

      expect(
        mockNotificationService.setCurrentRequestDeferFn
      ).not.toHaveBeenCalled();
      expect(ethSignTypedDataV4).not.toHaveBeenCalled();
    });

    test('and drops it once that component is gone', async () => {
      slot.target = safeTarget;
      await signWith(safeHandoff);

      expect(slot.target).toBeUndefined();
    });
  });
});
