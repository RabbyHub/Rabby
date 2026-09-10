const mockGetAllWindows = jest.fn().mockResolvedValue([]);

jest.mock('webextension-polyfill', () => ({
  __esModule: true,
  default: {
    windows: { getAll: mockGetAllWindows, update: jest.fn() },
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
  EVENTS: {
    SIGN_WAITING_AMOUNTED: 'SIGN_WAITING_AMOUNTED',
    broadcastToUI: 'broadcastToUI',
    RELOAD_APPROVAL: 'RELOAD_APPROVAL',
  },
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

import notificationService from '@/background/service/notification';
import eventBus from '@/eventBus';
import { EVENTS } from 'consts';
import { winMgr } from 'background/webapi';
import { signingFlowService } from '@/background/service/signingFlow';
import transactionHistoryService from '@/background/service/transactionHistory';
import {
  asInternalSignRequestId,
  toApprovalRef,
  toSigningFlowRef,
} from '@/utils/signingTypes';

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
    notificationService.invalidateAllSigningFlows();
    notificationService.notifiWindowId = null;
    notificationService.isLocked = false;
    mockOpenNotification.mockClear();
    mockCaptureException.mockClear();
    mockGetAllWindows.mockReset();
    mockGetAllWindows.mockResolvedValue([]);
    (transactionHistoryService.removeAllSigningTx as jest.Mock).mockClear();
    (transactionHistoryService.removeSigningTx as jest.Mock).mockClear();
  });

  test('opens the next approval while the Connect window is being removed', async () => {
    const connected = notificationService.requestApproval({
      approvalComponent: 'Connect',
      params: { origin: 'https://dapp.test' },
    });
    await Promise.resolve();
    const approval = notificationService.getCurrentApproval()!;
    await notificationService.resolveApprovalFor({
      approval: toApprovalRef(approval.id, 'Connect'),
      data: {},
    });
    await connected;

    let removed!: () => void;
    (winMgr.remove as jest.Mock).mockImplementationOnce(
      () => new Promise<void>((resolve) => (removed = resolve))
    );
    notificationService.rejectAllApprovals();
    void notificationService.requestApproval(signTxRequest());
    expect(mockOpenNotification).toHaveBeenCalledTimes(2);
    await Promise.resolve();
    removed();
    await Promise.resolve();
    expect(notificationService.notifiWindowId).toBe(1);
    expect(notificationService.isLocked).toBe(true);
    expect(notificationService.currentApproval?.data.approvalComponent).toBe(
      'SignTx'
    );
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

  test('publishes the initial signing attempt on the approval', () => {
    const flowId = 'flow-1';

    void notificationService.requestApproval(signTxRequest(), undefined, {
      signing: { flow: toSigningFlowRef(flowId) },
    });

    const approval = notificationService.getCurrentApproval();
    expect(approval?.data.signing?.flow.flowId).toBe(flowId);
    expect(approval?.data.signing?.attempt.attemptId).toBe(
      signingFlowService.getActiveAttempt(toSigningFlowRef(flowId))?.attemptId
    );
    expect(approval?.data.signing?.attempt.attemptId).toBeTruthy();
  });

  test('allows a signer account to differ on an explicit nested continuation', () => {
    const flow = signingFlowService.createFlow({
      flowId: 'gnosis-flow',
      account: { address: '0xsafe', type: 'gnosis', brandName: 'Gnosis' },
      origin: 'https://dapp.test',
      rpcRequestId: 'gnosis-request',
    });
    const attempt = signingFlowService.createAttempt(flow)!;

    void notificationService.requestApproval(
      {
        approvalComponent: 'LedgerHardwareWaiting',
        origin: 'https://dapp.test',
        account: {
          address: '0xowner',
          type: 'privateKey',
          brandName: 'Rabby',
        },
        params: { data: [] },
        isGnosis: true,
        isUnshift: true,
      },
      undefined,
      { signing: { flow, attempt } }
    );

    expect(notificationService.getCurrentApproval()?.data.account.address).toBe(
      '0xowner'
    );
    expect(
      notificationService.getCurrentApproval()?.data.signing?.flow.flowId
    ).toBe('gnosis-flow');
    expect(
      notificationService.getCurrentApproval()?.data.signing?.attempt.attemptId
    ).toBe(attempt.attemptId);
    expect(signingFlowService.getAttemptApproval(attempt)).toEqual(
      toApprovalRef(
        notificationService.getCurrentApproval()!.id,
        'LedgerHardwareWaiting'
      )
    );
    expect(signingFlowService.getFlow(flow)?.account?.address).toBe('0xsafe');
  });

  test.each([
    { isGnosis: false, explicitAttempt: true, origin: 'https://dapp.test' },
    { isGnosis: true, explicitAttempt: false, origin: 'https://dapp.test' },
    { isGnosis: true, explicitAttempt: true, origin: 'https://other.test' },
  ])(
    'rejects an unbound signer-account handoff: %j',
    async ({ isGnosis, explicitAttempt, origin }) => {
      const flow = signingFlowService.createFlow({
        account: { address: '0xsafe', type: 'gnosis', brandName: 'Gnosis' },
        origin: 'https://dapp.test',
        rpcRequestId: 'guarded-handoff',
      });
      const attempt = signingFlowService.createAttempt(flow)!;
      await expect(
        notificationService.requestApproval(
          {
            approvalComponent: 'LedgerHardwareWaiting',
            account: {
              address: '0xowner',
              type: 'Ledger',
              brandName: 'Ledger',
            },
            origin,
            params: {},
            isGnosis,
            isUnshift: true,
          },
          undefined,
          { signing: { flow, ...(explicitAttempt ? { attempt } : {}) } }
        )
      ).rejects.toMatchObject({ code: 4001 });
      expect(notificationService.getCurrentApproval()).toBeNull();
    }
  );

  test('prioritizes request-scoped internal signing approvals', () => {
    void notificationService.requestApproval(signTxRequest());

    const requestId = asInternalSignRequestId('internal-sign-request');
    void notificationService.requestApproval({
      approvalComponent: 'SignTypedData',
      origin: 'https://dapp.test',
      account: { address: '0xaccount' },
      params: { data: [] },
      internalSignRequestId: requestId,
      isUnshift: true,
    });

    expect(
      notificationService.getCurrentApproval()?.data.internalSignRequestId
    ).toBe(requestId);
  });

  test('allows an explicitly linked internal signer behind Connect', () => {
    const parent = {
      approvalComponent: 'Connect' as const,
      origin: 'https://dapp.test',
      account: { address: '0xaccount' },
      params: {},
    };

    void notificationService.requestApproval(parent);
    const parentApproval = notificationService.getCurrentApproval();
    expect(parentApproval).toBeTruthy();

    void notificationService.requestApproval(
      {
        approvalComponent: 'SignTypedData',
        origin: 'https://dapp.test',
        account: { address: '0xaccount' },
        params: { data: [] },
        internalSignRequestId: asInternalSignRequestId('perps-sign-request'),
        isUnshift: true,
      },
      undefined,
      {
        parentApproval: toApprovalRef(
          parentApproval!.id,
          parentApproval!.data.approvalComponent
        ),
      }
    );

    expect(
      notificationService.getCurrentApproval()?.data.approvalComponent
    ).toBe('SignTypedData');
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

  test('rejects approvals when activating the first approval fails', async () => {
    const approval = {
      id: 'approval-that-cannot-open',
      data: { approvalComponent: 'SignTx' },
      reject: jest.fn(),
    };
    notificationService.approvals = [approval as any];
    notificationService.currentApproval = approval as any;
    mockGetAllWindows.mockRejectedValueOnce(new Error('windows unavailable'));

    await notificationService.activeFirstApproval();

    expect(approval.reject).toHaveBeenCalled();
    expect(notificationService.approvals).toEqual([]);
    expect(notificationService.currentApproval).toBeNull();
  });

  test('does not cancel an unrelated direct signing flow on activation failure', async () => {
    const direct = signingFlowService.startAttempt({
      account: { address: '0xaccount', type: 'privateKey', brandName: 'Rabby' },
      origin: 'internal',
    });
    expect(direct).toBeTruthy();

    const approval = {
      id: 'approval-that-cannot-open',
      data: { approvalComponent: 'AddAsset' },
      reject: jest.fn(),
    };
    notificationService.approvals = [approval as any];
    notificationService.currentApproval = approval as any;
    mockGetAllWindows.mockRejectedValueOnce(new Error('windows unavailable'));

    await notificationService.activeFirstApproval();

    expect(approval.reject).toHaveBeenCalled();
    expect(signingFlowService.isCurrentAttempt(direct!.attempt)).toBe(true);
  });

  test('only removes approval signing records on scoped activation failure', async () => {
    const approval = {
      id: 'approval-that-cannot-open',
      signingTxId: 'approval-signing-tx',
      data: { approvalComponent: 'SignTx' },
      reject: jest.fn(),
    };
    notificationService.approvals = [approval as any];
    notificationService.currentApproval = approval as any;
    mockGetAllWindows.mockRejectedValueOnce(new Error('windows unavailable'));

    await notificationService.activeFirstApproval();

    expect(transactionHistoryService.removeSigningTx).toHaveBeenCalledWith(
      'approval-signing-tx'
    );
    expect(transactionHistoryService.removeAllSigningTx).not.toHaveBeenCalled();
  });

  test('rejects an unbound internal signer on scoped activation failure', async () => {
    const requestId = asInternalSignRequestId('internal-sign-request');
    const signing = notificationService.requestInternalPersonalSign({
      requestId,
    });
    const approval = {
      id: 'approval-that-cannot-open',
      data: {
        approvalComponent: 'SignTypedData',
        internalSignRequestId: requestId,
      },
      reject: jest.fn(),
    };
    notificationService.approvals = [approval as any];
    notificationService.currentApproval = approval as any;
    mockGetAllWindows.mockRejectedValueOnce(new Error('windows unavailable'));

    await notificationService.activeFirstApproval();

    await expect(signing).rejects.toMatchObject({ code: 4001 });
  });

  test('session invalidation rejects queued approvals without a current one', () => {
    const queuedApproval = {
      id: 'queued-approval',
      data: { approvalComponent: 'SignTx' },
      reject: jest.fn(),
    };
    notificationService.approvals = [queuedApproval as any];
    notificationService.currentApproval = null;

    notificationService.invalidateApprovalSession();

    expect(queuedApproval.reject).toHaveBeenCalled();
    expect(notificationService.approvals).toEqual([]);
  });

  test.each([false, true])(
    'a dapp chain change preserves other origins (affected current: %s)',
    (affectedCurrent) => {
      const changedOrigin = 'https://chain-switcher.test';
      const approvals = [changedOrigin, 'https://signer.test'].map(
        (origin) => ({
          id: origin,
          signingTxId: origin,
          data: { approvalComponent: 'SignTx', origin },
          reject: jest.fn(),
        })
      );
      const direct = [
        'https://chain-switcher.test',
        'https://signer.test',
        'rabby',
      ].map(
        (origin) =>
          signingFlowService.startAttempt({
            origin,
            account: {
              address: '0xaccount',
              type: 'Private Key',
              brandName: 'Private Key',
            },
          })!
      );
      notificationService.approvals = approvals as any;
      notificationService.currentApproval = approvals[
        affectedCurrent ? 0 : 1
      ] as any;
      notificationService.notifiWindowId = 99;
      const broadcast = jest.spyOn(eventBus, 'emit');

      notificationService.invalidateApprovalSession(changedOrigin);

      expect(approvals[1].reject).not.toHaveBeenCalled();
      expect(notificationService.currentApproval).toBe(approvals[1]);
      expect(notificationService.approvals).toEqual([approvals[1]]);
      expect(notificationService.notifiWindowId).toBe(99);
      expect(approvals[0].reject).toHaveBeenCalledWith(
        expect.objectContaining({ code: 4001 })
      );
      expect(
        direct.map(({ attempt }) =>
          signingFlowService.isCurrentAttempt(attempt)
        )
      ).toEqual([false, true, true]);
      expect(transactionHistoryService.removeSigningTx).toHaveBeenCalledWith(
        changedOrigin
      );
      expect(
        transactionHistoryService.removeAllSigningTx
      ).not.toHaveBeenCalled();
      expect(broadcast.mock.calls).toEqual(
        affectedCurrent
          ? [[EVENTS.broadcastToUI, { method: EVENTS.RELOAD_APPROVAL }]]
          : []
      );
      broadcast.mockRestore();
    }
  );

  test('origin invalidation also cancels a signer after its approval has resolved', () => {
    const context = signingFlowService.startAttempt({
      origin: 'https://dapp.test',
      account: {
        address: '0xaccount',
        type: 'Private Key',
        brandName: 'Private Key',
      },
    })!;
    expect(notificationService.approvals).toEqual([]);

    notificationService.invalidateApprovalSession(context.origin);

    expect(signingFlowService.isCurrentAttempt(context.attempt)).toBe(false);
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
