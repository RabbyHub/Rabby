jest.mock('webextension-polyfill', () => ({
  __esModule: true,
  default: {
    windows: { getAll: jest.fn().mockResolvedValue([]), update: jest.fn() },
    action: { setBadgeText: jest.fn(), setBadgeBackgroundColor: jest.fn() },
    browserAction: {
      setBadgeText: jest.fn(),
      setBadgeBackgroundColor: jest.fn(),
    },
  },
}));

const mockOpenNotification = jest.fn().mockResolvedValue(1);

jest.mock('consts', () => ({
  KEYRING_CATEGORY_MAP: {},
  IS_LINUX: false,
  IS_VIVALDI: false,
  IS_CHROME: false,
  KEYRING_CATEGORY: {},
  IS_WINDOWS: false,
}));

jest.mock('background/webapi', () => ({
  winMgr: {
    event: { on: jest.fn() },
    openNotification: mockOpenNotification,
    remove: jest.fn(),
  },
}));

jest.mock('@/background/service/transactionHistory', () => ({
  __esModule: true,
  default: {
    addSigningTx: jest.fn(() => 'signing-tx-id'),
    getSigningTx: jest.fn(),
  },
}));

jest.mock('@/background/service/preference', () => ({
  __esModule: true,
  default: {
    getCurrentAccount: jest.fn(() => ({ address: '0xaccount' })),
  },
}));

jest.mock('@/stats', () => ({
  __esModule: true,
  default: { report: jest.fn() },
}));

jest.mock('@/utils/chain', () => ({ findChain: jest.fn() }));

jest.mock('@/utils/env', () => ({ isManifestV3: false }));

const mockCaptureException = jest.fn();
jest.mock('@sentry/browser', () => ({
  captureException: (...args: unknown[]) => mockCaptureException(...args),
}));

import notificationService from '@/background/service/notification';

const signTxRequest = (signTxPreparationId?: string) => ({
  approvalComponent: 'SignTx' as const,
  origin: 'https://dapp.test',
  account: { address: '0xaccount' },
  params: {
    data: [{}],
    ...(signTxPreparationId ? { signTxPreparationId } : {}),
  },
});

describe('notificationService SignTx queueing', () => {
  beforeEach(() => {
    notificationService.approvals = [];
    notificationService.currentApproval = null;
    notificationService.notifiWindowId = null;
    notificationService.isLocked = false;
    mockOpenNotification.mockClear();
    mockCaptureException.mockClear();
  });

  test('second queued SignTx request does not become currentApproval', () => {
    // Mirrors the two-transaction race rpcFlow.ts guards against: dapp fires
    // approve + swap back to back, only the first should be eligible for
    // preparation, the second must be queued behind it.
    const firstRequest = signTxRequest();
    const secondRequest = signTxRequest();
    const firstOnCurrent = () => {
      Object.assign(firstRequest.params, { signTxPreparationId: 'prep-1' });
    };
    const secondOnCurrent = jest.fn();

    void notificationService.requestApproval(firstRequest, undefined, {
      onCurrent: firstOnCurrent,
    });
    expect(
      notificationService.currentApproval?.data?.params?.signTxPreparationId
    ).toBe('prep-1');

    void notificationService.requestApproval(secondRequest, undefined, {
      onCurrent: secondOnCurrent,
    });
    expect(
      notificationService.currentApproval?.data?.params?.signTxPreparationId
    ).toBe('prep-1');
    expect(secondRequest.params.signTxPreparationId).toBeUndefined();
    expect(notificationService.approvals).toHaveLength(2);
    expect(secondOnCurrent).not.toHaveBeenCalled();
  });

  test('onCurrent failure does not prevent opening the notification', () => {
    const request = signTxRequest();
    const error = new Error('preparation failed synchronously');

    void notificationService.requestApproval(request, undefined, {
      onCurrent: () => {
        throw error;
      },
    });

    expect(mockOpenNotification).toHaveBeenCalledTimes(1);
    expect(notificationService.currentApproval).not.toBeNull();
    expect(mockCaptureException).toHaveBeenCalledTimes(1);
    expect(mockCaptureException.mock.calls[0][0].message).toContain(
      'onCurrent failed'
    );
  });
});
