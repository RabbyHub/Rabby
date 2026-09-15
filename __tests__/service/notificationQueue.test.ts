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
          ? notificationService.resolveApprovalFor({
              approval: { id: id as string, component },
              data: {},
            })
          : notificationService.rejectApprovalFor({
              approval: { id: id as string, component },
              stay: true,
            });

      expect(await settle('stale', 'SignTx')).toEqual({
        accepted: false,
        reason: 'APPROVAL_ID_MISMATCH',
      });
      expect(await settle('current', 'SignTypedData')).toEqual({
        accepted: false,
        reason: 'APPROVAL_COMPONENT_MISMATCH',
      });
      expect(await settle(undefined, 'SignTx')).toEqual({
        accepted: false,
        reason: 'INVALID_APPROVAL_REF',
      });
      expect(approval.resolve).not.toHaveBeenCalled();
      expect(approval.reject).not.toHaveBeenCalled();
      expect(notificationService.currentApproval).toBe(approval);
      expect(notificationService.approvals).toEqual([approval]);
    }
  );

  test.each([
    undefined,
    null,
    {},
    { id: '' },
    { id: 'current' },
    { id: 'current', component: '' },
    { id: 'current', component: 'NotARealApprovalType' },
    { id: 123, component: 'SignTx' },
  ] as const)(
    'rejects malformed/illegal refs as INVALID_APPROVAL_REF: %j',
    async (badRef) => {
      const approval = makeApproval('current');
      notificationService.approvals = [approval];
      notificationService.currentApproval = approval;

      expect(
        await notificationService.resolveApprovalFor({
          approval: badRef as any,
        })
      ).toEqual({ accepted: false, reason: 'INVALID_APPROVAL_REF' });
      expect(
        await notificationService.rejectApprovalFor({
          approval: badRef as any,
        })
      ).toEqual({ accepted: false, reason: 'INVALID_APPROVAL_REF' });
      expect(approval.resolve).not.toHaveBeenCalled();
      expect(approval.reject).not.toHaveBeenCalled();
      expect(notificationService.currentApproval).toBe(approval);
    }
  );

  test('resolveApprovalFor with no current approval reports NO_CURRENT_APPROVAL', async () => {
    notificationService.currentApproval = null;
    expect(
      await notificationService.resolveApprovalFor({
        approval: { id: 'anything', component: 'SignTx' },
      })
    ).toEqual({ accepted: false, reason: 'NO_CURRENT_APPROVAL' });
  });

  test('resolves exactly the displayed request and rejects reuse against the next queued request', async () => {
    const first = makeApproval('first');
    const second = makeApproval('second');
    notificationService.approvals = [first, second];
    notificationService.currentApproval = first;

    expect(
      await notificationService.resolveApprovalFor({
        approval: { id: 'first', component: 'SignTx' },
        data: { signed: true },
      })
    ).toEqual({ accepted: true });
    expect(first.resolve).toHaveBeenCalledWith({ signed: true });
    expect(notificationService.currentApproval).toBe(second);

    // Reusing the same (now-consumed) ref must not touch `second`.
    expect(
      await notificationService.resolveApprovalFor({
        approval: { id: 'first', component: 'SignTx' },
        data: {},
      })
    ).toEqual({ accepted: false, reason: 'APPROVAL_ID_MISMATCH' });
    expect(second.resolve).not.toHaveBeenCalled();
  });

  test('rejects only the bound request', async () => {
    const first = makeApproval('first', 'SignTypedData');
    const second = makeApproval('second');
    notificationService.approvals = [first, second];
    notificationService.currentApproval = first;

    expect(
      await notificationService.rejectApprovalFor({
        approval: { id: 'first', component: 'SignTypedData' },
        stay: true,
      })
    ).toEqual({ accepted: true });
    expect(first.reject).toHaveBeenCalledTimes(1);
    expect(second.reject).not.toHaveBeenCalled();
    expect(notificationService.currentApproval).toBe(second);
  });

  test('duplicate resolve/reject race on the same ref settles exactly once', async () => {
    const approval = makeApproval('current');
    notificationService.approvals = [approval];
    notificationService.currentApproval = approval;
    const ref = { id: 'current', component: 'SignTx' } as const;

    const [resolveResult, rejectResult] = await Promise.all([
      notificationService.resolveApprovalFor({ approval: ref, data: {} }),
      notificationService.rejectApprovalFor({ approval: ref }),
    ]);

    const results = [resolveResult, rejectResult];
    const acceptedCount = results.filter((r) => r.accepted).length;
    expect(acceptedCount).toBe(1);
    // Whichever ran first wins the resolve/resolve(reject) call; the other sees
    // the approval already consumed.
    const calledResolve = (approval.resolve as jest.Mock).mock.calls.length;
    const calledReject = (approval.reject as jest.Mock).mock.calls.length;
    expect(calledResolve + calledReject).toBe(1);
  });

  test('forceReject is validated through the same ref check', async () => {
    const approval = makeApproval('current');
    notificationService.approvals = [approval];
    notificationService.currentApproval = approval;

    expect(
      await notificationService.resolveApprovalFor({
        approval: { id: 'wrong', component: 'SignTx' },
        forceReject: true,
      })
    ).toEqual({ accepted: false, reason: 'APPROVAL_ID_MISMATCH' });
    expect(approval.reject).not.toHaveBeenCalled();

    expect(
      await notificationService.resolveApprovalFor({
        approval: { id: 'current', component: 'SignTx' },
        forceReject: true,
      })
    ).toEqual({ accepted: true });
    expect(approval.reject).toHaveBeenCalledTimes(1);
    expect(approval.resolve).not.toHaveBeenCalled();
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
    const firstOnCurrent = jest.fn(() => {
      Object.assign(firstRequest.params, { signTxPreparationId: 'prep-1' });
    });
    const secondOnCurrent = jest.fn();

    void notificationService.requestApproval(firstRequest, undefined, {
      onCurrent: firstOnCurrent,
    });
    expect(firstOnCurrent).toHaveBeenCalledWith({
      id: notificationService.getApproval()!.id,
      component: 'SignTx',
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
