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
    removeSigningTx: jest.fn(),
    removeAllSigningTx: jest.fn(),
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

import notificationService, {
  Approval,
} from '@/background/service/notification';

const signTxRequest = (signTxPreparationId?: string) => ({
  approvalComponent: 'SignTx' as const,
  origin: 'https://dapp.test',
  account: { address: '0xaccount' },
  params: {
    data: [{}],
    ...(signTxPreparationId ? { signTxPreparationId } : {}),
  },
});

describe('notificationService approval identity', () => {
  const makeApproval = (
    id: string,
    approvalComponent: Approval['data']['approvalComponent'] = 'SignTx'
  ): Approval => ({
    id,
    taskId: null,
    winProps: {},
    data: {
      approvalComponent,
      account: {
        address: '0xaccount',
        type: 'PrivateKey',
        brandName: 'PrivateKey',
      },
    },
    resolve: jest.fn(),
    reject: jest.fn(),
  });

  beforeEach(() => {
    notificationService.approvals = [];
    notificationService.currentApproval = null;
    notificationService.notifiWindowId = null;
    notificationService.dappManager.clear();
  });

  test.each(['resolve', 'reject'] as const)(
    '%s refuses stale id or mismatched component without touching the queue',
    async (method) => {
      const approval = makeApproval('current');
      notificationService.approvals = [approval];
      notificationService.currentApproval = approval;
      const settle = (
        id: string | undefined,
        component: 'SignTx' | 'SignTypedData'
      ) =>
        method === 'resolve'
          ? notificationService.resolveApproval({}, false, id, component)
          : notificationService.rejectApproval(
              undefined,
              true,
              false,
              id,
              component
            );

      expect(await settle('stale', 'SignTx')).toBe(false);
      expect(await settle('current', 'SignTypedData')).toBe(false);
      expect(await settle(undefined, 'SignTx')).toBe(false);
      expect(approval.resolve).not.toHaveBeenCalled();
      expect(approval.reject).not.toHaveBeenCalled();
      expect(notificationService.currentApproval).toBe(approval);
      expect(notificationService.approvals).toEqual([approval]);
    }
  );

  test('resolves exactly the displayed request and rejects reuse against the next queued request', async () => {
    const first = makeApproval('first');
    const second = makeApproval('second');
    notificationService.approvals = [first, second];
    notificationService.currentApproval = first;

    expect(
      await notificationService.resolveApproval(
        { signed: true },
        false,
        'first',
        'SignTx'
      )
    ).toBe(true);
    expect(first.resolve).toHaveBeenCalledWith({ signed: true });
    expect(notificationService.currentApproval).toBe(second);
    expect(
      await notificationService.resolveApproval({}, false, 'first', 'SignTx')
    ).toBe(false);
    expect(second.resolve).not.toHaveBeenCalled();
  });

  test('rejects only the bound request', async () => {
    const first = makeApproval('first', 'SignTypedData');
    const second = makeApproval('second');
    notificationService.approvals = [first, second];
    notificationService.currentApproval = first;

    expect(
      await notificationService.rejectApproval(
        undefined,
        true,
        false,
        'first',
        'SignTypedData'
      )
    ).toBe(true);
    expect(first.reject).toHaveBeenCalledTimes(1);
    expect(second.reject).not.toHaveBeenCalled();
    expect(notificationService.currentApproval).toBe(second);
  });
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

  test('unlocks when the notification window is not created', async () => {
    mockOpenNotification.mockResolvedValueOnce(undefined);

    notificationService.openNotification({});
    expect(notificationService.isLocked).toBe(true);

    await Promise.resolve();

    expect(notificationService.notifiWindowId).toBeNull();
    expect(notificationService.isLocked).toBe(false);
  });

  test('unlocks and reports when notification window creation rejects', async () => {
    const error = new Error('window creation failed');
    mockOpenNotification.mockRejectedValueOnce(error);

    notificationService.openNotification({});
    await Promise.resolve();
    await Promise.resolve();

    expect(notificationService.notifiWindowId).toBeNull();
    expect(notificationService.isLocked).toBe(false);
    expect(mockCaptureException).toHaveBeenCalledWith(error, {
      tags: { function: 'openNotification' },
    });
  });
});
