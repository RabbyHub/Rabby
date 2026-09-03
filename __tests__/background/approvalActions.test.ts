jest.mock('webextension-polyfill', () => ({
  __esModule: true,
  default: {
    windows: {
      WINDOW_ID_NONE: -1,
      getAll: jest.fn().mockResolvedValue([]),
      remove: jest.fn().mockResolvedValue(undefined),
      update: jest.fn(),
    },
    action: { setBadgeText: jest.fn(), setBadgeBackgroundColor: jest.fn() },
    browserAction: {
      setBadgeText: jest.fn(),
      setBadgeBackgroundColor: jest.fn(),
    },
    storage: {
      local: { get: jest.fn().mockResolvedValue({}) },
    },
    tabs: { onCreated: { addListener: jest.fn() } },
    runtime: { getManifest: jest.fn(() => ({ manifest_version: 3 })) },
  },
}));

jest.mock('background/webapi', () => ({
  winMgr: {
    event: { on: jest.fn() },
    openNotification: jest.fn(),
    remove: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/background/service/transactionHistory', () => ({
  __esModule: true,
  default: { removeAllSigningTx: jest.fn(), removeSigningTx: jest.fn() },
}));

jest.mock('@/background/service/preference', () => ({
  __esModule: true,
  default: { getCurrentAccount: jest.fn(() => null) },
}));

jest.mock('@/stats', () => ({
  __esModule: true,
  default: { report: jest.fn() },
}));

jest.mock('@sentry/browser', () => ({
  addBreadcrumb: jest.fn(),
  captureException: jest.fn(),
}));

import notificationService from '@/background/service/notification';
import { signingFlowService } from '@/background/service/signingFlow';
import { waitForSigningUi } from '@/utils/signEvent';
import {
  asInternalSignRequestId,
  toApprovalRef,
  toSigningFlowRef,
} from '@/utils/signingTypes';

const pending = (id: string) => {
  const approval = {
    id,
    taskId: null,
    data: { approvalComponent: 'SignTx' },
    resolve: jest.fn(),
    reject: jest.fn(),
  } as any;

  (notificationService as any).approvals = [approval];
  (notificationService as any).currentApproval = approval;
  return approval;
};

const approvalRef = (
  approval: any,
  component = approval.data.approvalComponent
) => toApprovalRef(approval.id, component);

const start = (approval: any, flowId: string) => {
  const flow = signingFlowService.createFlow({
    flowId,
    origin: approval.data.origin || '',
    rpcRequestId: flowId,
  });
  const attempt = signingFlowService.createAttempt(flow, {
    approvalId: approval.id,
  });
  const ref = approvalRef(approval);
  signingFlowService.attachApproval(flow, ref);
  signingFlowService.bindAttemptApproval(attempt!, ref);
  approval.data.signing = { flow, attempt };
  return attempt;
};

const setFlow = (approval: any, flowId: string, attempt?: any) => {
  approval.data.signing = { flow: toSigningFlowRef(flowId), attempt };
};

describe('approval actions validate the current identity', () => {
  beforeEach(() => {
    (notificationService as any).approvals = [];
    (notificationService as any).currentApproval = null;
    notificationService.invalidateAllSigningFlows();
  });

  it('resolves the named approval while it is current', async () => {
    const approval = pending('a');

    await expect(
      notificationService.resolveApprovalFor({
        approval: toApprovalRef('a', 'SignTx'),
        data: { signed: true },
      })
    ).resolves.toEqual({ accepted: true });

    expect(approval.resolve).toHaveBeenCalledWith({ signed: true });
    expect(notificationService.getCurrentApproval()).toBeNull();
  });

  it('rejects a stale resolve and leaves the replacement untouched', async () => {
    const approval = pending('b');

    await expect(
      notificationService.resolveApprovalFor({
        approval: toApprovalRef('a', 'SignTx'),
        data: { signed: true },
      })
    ).resolves.toEqual({
      accepted: false,
      reason: 'APPROVAL_ID_MISMATCH',
    });

    expect(approval.resolve).not.toHaveBeenCalled();
    expect(approval.reject).not.toHaveBeenCalled();
    expect(notificationService.getCurrentApproval()).toBe(approval);
  });

  it('rejects a stale reject and leaves the replacement current', async () => {
    const approval = pending('b');

    await expect(
      notificationService.rejectApprovalFor({
        approval: toApprovalRef('a', 'SignTx'),
        error: 'user cancel',
      })
    ).resolves.toEqual({
      accepted: false,
      reason: 'APPROVAL_ID_MISMATCH',
    });

    expect(approval.reject).not.toHaveBeenCalled();
    expect(notificationService.getCurrentApproval()).toBe(approval);
  });

  it('rejects an action with the right id but the wrong component', async () => {
    const approval = pending('a');

    await expect(
      notificationService.resolveApprovalFor({
        approval: approvalRef(approval, 'SignText'),
        data: { signed: true },
      })
    ).resolves.toEqual({
      accepted: false,
      reason: 'APPROVAL_COMPONENT_MISMATCH',
    });

    expect(approval.resolve).not.toHaveBeenCalled();
    expect(notificationService.getCurrentApproval()).toBe(approval);
  });

  it('rejects a second invocation after the next approval becomes current', async () => {
    const first = pending('a');
    await notificationService.resolveApprovalFor({
      approval: toApprovalRef('a', 'SignTx'),
    });
    const second = pending('b');

    await expect(
      notificationService.resolveApprovalFor({
        approval: toApprovalRef('a', 'SignTx'),
      })
    ).resolves.toEqual({
      accepted: false,
      reason: 'APPROVAL_ID_MISMATCH',
    });

    expect(first.resolve).toHaveBeenCalledTimes(1);
    expect(second.resolve).not.toHaveBeenCalled();
    expect(second.reject).not.toHaveBeenCalled();
  });

  it('cancels the previous signing attempt when a retry starts', async () => {
    const approval = pending('signing-approval');
    const first = start(approval, 'flow');
    const waiting = waitForSigningUi(first!);
    const second = signingFlowService.createAttempt(toSigningFlowRef('flow'));

    await expect(waiting).rejects.toMatchObject({ code: 4001 });
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    expect(signingFlowService.isCurrentAttempt(first!)).toBe(false);
    expect(signingFlowService.isCurrentAttempt(second!)).toBe(true);
  });

  it('publishes a rotated retry attempt on the current approval', () => {
    const approval = pending('signing-approval');
    const first = start(approval, 'flow');
    const second = signingFlowService.createAttempt(toSigningFlowRef('flow'));
    approval.data.signing.attempt = second;

    expect(second?.attemptId).not.toBe(first?.attemptId);
    expect(approval.data.signing.attempt.attemptId).toBe(second?.attemptId);
  });

  it('does not start a signing attempt for a stale flow', () => {
    const approval = pending('other-approval');
    setFlow(approval, 'other-flow');

    expect(
      signingFlowService.createAttempt(toSigningFlowRef('stale-flow'))
    ).toBeUndefined();
  });

  it('does not start an attempt for a stale approval in the same flow', () => {
    const approval = pending('signing-approval');
    const currentAttempt = start(approval, 'flow');

    const replacement = pending('replacement-approval');
    setFlow(replacement, 'flow', currentAttempt);

    expect(
      signingFlowService.isAttemptValidForApproval(
        currentAttempt!,
        replacement.id
      )
    ).toBe(false);
    expect(signingFlowService.isCurrentAttempt(currentAttempt!)).toBe(true);
  });

  it('does not start a legacy attempt for a stale approval id', () => {
    pending('current-approval');

    expect(notificationService.isApprovalCurrent('stale-approval')).toBe(false);
  });

  it('keeps a direct attempt valid while a queued approval becomes current', async () => {
    const approval = pending('signing-approval');
    const attempt = start(approval, 'flow');

    const replacement = pending('other-approval');
    setFlow(replacement, 'other-flow');
    (notificationService as any).approvals = [approval, replacement];
    (notificationService as any).currentApproval = approval;

    await notificationService.resolveApprovalFor({
      approval: approvalRef(approval),
    });

    expect(signingFlowService.isCurrentAttempt(attempt!)).toBe(true);
  });

  it('invalidates an attempt when another approval in the same flow becomes current', () => {
    const approval = pending('signing-approval');
    const attempt = start(approval, 'flow');

    const replacement = pending('replacement-approval');
    setFlow(replacement, 'flow', attempt);

    expect(
      signingFlowService.isAttemptValidForApproval(attempt!, replacement.id)
    ).toBe(false);
  });

  it('keeps a direct signing attempt valid after its approval resolves', async () => {
    const approval = pending('direct-signing-approval');
    const attempt = start(approval, 'flow');

    await notificationService.resolveApprovalFor({
      approval: approvalRef(approval),
    });

    expect(signingFlowService.isCurrentAttempt(attempt!)).toBe(true);
  });

  it('invalidates an attempt when a waiting approval resolves', async () => {
    const approval = pending('waiting-approval');
    approval.data.approvalComponent = 'LedgerHardwareWaiting';
    const attempt = start(approval, 'flow');

    await notificationService.resolveApprovalFor({
      approval: approvalRef(approval),
    });

    expect(signingFlowService.isCurrentAttempt(attempt!)).toBe(false);
  });

  it('allows a matching waiting approval to close after its attempt finishes', async () => {
    const approval = pending('finished-waiting-approval');
    approval.data.approvalComponent = 'LedgerHardwareWaiting';
    const attempt = start(approval, 'finished-flow')!;
    const flow = signingFlowService.getFlow(attempt.flowId)!;
    signingFlowService.markUiReady(attempt);

    const owner = signingFlowService.run(flow.ref, attempt, async () => 'sig');
    await expect(owner).resolves.toBe('sig');

    await expect(
      notificationService.resolveApprovalFor({
        approval: approvalRef(approval),
        signing: { attempt },
        data: 'sig',
      })
    ).resolves.toEqual({ accepted: true });
  });

  it('rejects pending approvals and invalidates direct signing at a session boundary', async () => {
    const approval = pending('session-boundary-approval');
    const attempt = start(approval, 'session-boundary-flow');

    notificationService.invalidateApprovalSession();
    await Promise.resolve();

    expect(approval.reject).toHaveBeenCalled();
    expect(signingFlowService.isCurrentAttempt(attempt!)).toBe(false);
  });

  it('invalidates a signing attempt when its approval is rejected', async () => {
    const approval = pending('flow-approval');
    const attempt = start(approval, 'flow');

    await notificationService.rejectApprovalFor({
      approval: approvalRef(approval),
      error: 'cancel',
    });

    expect(signingFlowService.isCurrentAttempt(attempt!)).toBe(false);
  });

  it('rejects a stale attempt from resolving the current approval', async () => {
    const approval = pending('flow-approval');
    const first = start(approval, 'flow');
    const second = signingFlowService.createAttempt(toSigningFlowRef('flow'));
    signingFlowService.bindAttemptApproval(second!, approvalRef(approval));
    approval.data.signing.attempt = second;

    await expect(
      notificationService.resolveApprovalFor({
        approval: approvalRef(approval),
        signing: { attempt: first! },
      })
    ).resolves.toEqual({
      accepted: false,
      reason: 'SIGNING_ATTEMPT_MISMATCH',
    });

    expect(approval.resolve).not.toHaveBeenCalled();
    expect(
      await notificationService.resolveApprovalFor({
        approval: approvalRef(approval),
        signing: { attempt: second! },
      })
    ).toEqual({ accepted: true });
  });

  it('rejects an attempt from another flow even when the approval id is current', async () => {
    const approval = pending('flow-b-approval');
    start(approval, 'flow-b');
    const otherFlow = signingFlowService.createFlow({
      flowId: 'flow-a',
      origin: 'https://a.test',
      rpcRequestId: 'a',
    });
    const otherAttempt = signingFlowService.createAttempt(otherFlow, {
      awaitUi: false,
    });

    await expect(
      notificationService.resolveApprovalFor({
        approval: approvalRef(approval),
        signing: { attempt: otherAttempt! },
      })
    ).resolves.toEqual({
      accepted: false,
      reason: 'SIGNING_ATTEMPT_MISMATCH',
    });
    expect(approval.resolve).not.toHaveBeenCalled();
  });

  it('correlates concurrent internal personal_sign requests by request id', async () => {
    const flowA = signingFlowService.createFlow({
      flowId: 'internal-flow-a',
      origin: 'internal',
      rpcRequestId: 'a',
    });
    const flowB = signingFlowService.createFlow({
      flowId: 'internal-flow-b',
      origin: 'internal',
      rpcRequestId: 'b',
    });
    const attemptA = signingFlowService.createAttempt(flowA, {
      awaitUi: false,
    })!;
    const attemptB = signingFlowService.createAttempt(flowB, {
      awaitUi: false,
    })!;
    const requestA = asInternalSignRequestId('internal-request-a');
    const requestB = asInternalSignRequestId('internal-request-b');
    const promiseA = notificationService.requestInternalPersonalSign({
      requestId: requestA,
      attempt: attemptA,
      request: { method: 'personal_sign', params: ['a'] },
    });
    const promiseB = notificationService.requestInternalPersonalSign({
      requestId: requestB,
      attempt: attemptB,
      request: { method: 'personal_sign', params: ['b'] },
    });

    expect(
      notificationService.settleInternalSignRequest(requestA, true, 'sig-a')
    ).toBe(true);
    await expect(promiseA).resolves.toBe('sig-a');
    expect((notificationService as any).internalSignWaiters.size).toBe(1);
    expect(
      notificationService.settleInternalSignRequest(requestA, true, 'late-a')
    ).toBe(false);

    expect(
      notificationService.settleInternalSignRequest(requestB, true, 'sig-b')
    ).toBe(true);
    await expect(promiseB).resolves.toBe('sig-b');
    expect((notificationService as any).internalSignWaiters.size).toBe(0);
  });

  it('cancels only the internal personal_sign request owned by the old flow', async () => {
    const flowA = signingFlowService.createFlow({
      flowId: 'cancel-internal-flow-a',
      origin: 'internal',
      rpcRequestId: 'a',
    });
    const flowB = signingFlowService.createFlow({
      flowId: 'cancel-internal-flow-b',
      origin: 'internal',
      rpcRequestId: 'b',
    });
    const attemptA = signingFlowService.createAttempt(flowA, {
      awaitUi: false,
    })!;
    const attemptB = signingFlowService.createAttempt(flowB, {
      awaitUi: false,
    })!;
    const promiseA = notificationService.requestInternalPersonalSign({
      requestId: asInternalSignRequestId('cancel-internal-request-a'),
      attempt: attemptA,
      request: { method: 'personal_sign', params: ['a'] },
    });
    const requestB = asInternalSignRequestId('cancel-internal-request-b');
    const promiseB = notificationService.requestInternalPersonalSign({
      requestId: requestB,
      attempt: attemptB,
      request: { method: 'personal_sign', params: ['b'] },
    });

    notificationService.invalidateSigningFlow(flowA.flowId);
    await expect(promiseA).rejects.toMatchObject({ code: 4001 });
    expect((notificationService as any).internalSignWaiters.size).toBe(1);
    expect(
      notificationService.settleInternalSignRequest(requestB, true, 'sig-b')
    ).toBe(true);
    await expect(promiseB).resolves.toBe('sig-b');
  });

  it('cancels internal personal_sign requests owned by child flows with the parent', async () => {
    const parent = signingFlowService.createFlow({
      flowId: 'parent-internal-flow',
      account: { address: '0xparent', type: 'cobo', brandName: 'Cobo' },
      origin: 'internal',
      rpcRequestId: 'parent',
    });
    const parentAttempt = signingFlowService.createAttempt(parent, {
      awaitUi: false,
    })!;
    const parentContext = {
      flow: parent,
      attempt: parentAttempt,
      account: { address: '0xparent', type: 'cobo', brandName: 'Cobo' },
      origin: 'internal',
      rpcRequestId: 'parent',
    };
    const child = signingFlowService.createChildAttempt({
      parent: parentContext,
      account: { address: '0xowner', type: 'privateKey', brandName: 'Rabby' },
      origin: 'internal',
    })!;
    const request = notificationService.requestInternalPersonalSign({
      requestId: asInternalSignRequestId('child-internal-request'),
      attempt: child.attempt,
      request: { method: 'personal_sign', params: ['child'] },
    });

    notificationService.invalidateSigningFlow(parent.flowId);

    await expect(request).rejects.toMatchObject({ code: 4001 });
    expect((notificationService as any).internalSignWaiters.size).toBe(0);
  });
});
