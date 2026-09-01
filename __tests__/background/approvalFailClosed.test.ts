jest.mock('webextension-polyfill', () => ({
  __esModule: true,
  default: {
    windows: {
      WINDOW_ID_NONE: -1,
      getAll: jest.fn().mockResolvedValue([]),
      remove: jest.fn(),
      update: jest.fn(),
    },
    action: { setBadgeText: jest.fn(), setBadgeBackgroundColor: jest.fn() },
    browserAction: {
      setBadgeText: jest.fn(),
      setBadgeBackgroundColor: jest.fn(),
    },
    storage: {
      local: { get: jest.fn().mockResolvedValue({}), set: jest.fn() },
      session: { get: jest.fn().mockResolvedValue({}), set: jest.fn() },
    },
    runtime: {
      onMessage: { addListener: jest.fn() },
      getManifest: () => ({ manifest_version: 3 }),
    },
    tabs: { onCreated: { addListener: jest.fn() }, query: jest.fn() },
  },
}));

const removeWindow = jest.fn();
jest.mock('background/webapi', () => ({
  winMgr: {
    event: { on: jest.fn() },
    openNotification: jest.fn(),
    remove: (...args: any[]) => removeWindow(...args),
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
const captureException = jest.fn();
const addBreadcrumb = jest.fn();
jest.mock('@sentry/browser', () => ({
  captureException: (...args: any[]) => captureException(...args),
  addBreadcrumb: (...args: any[]) => addBreadcrumb(...args),
}));

import notificationService from '@/background/service/notification';

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

describe('approval resolution is fail closed', () => {
  beforeEach(() => {
    captureException.mockClear();
    addBreadcrumb.mockClear();
    removeWindow.mockReset();
    removeWindow.mockResolvedValue(undefined);
  });

  it('refuses to resolve an approval that was not named', async () => {
    const approval = pending('a');

    await notificationService.resolveApproval({ signed: true });

    expect(approval.resolve).not.toHaveBeenCalled();
    expect(notificationService.getApproval()).toBe(approval);
  });

  it('refuses to reject an approval that was not named', async () => {
    const approval = pending('a');

    await notificationService.rejectApproval('user cancel');

    expect(approval.reject).not.toHaveBeenCalled();
    expect(notificationService.getApproval()).toBe(approval);
  });

  it('refuses to act on an approval that is no longer current', async () => {
    const approval = pending('a');

    await notificationService.resolveApproval({ signed: true }, false, 'b');
    await notificationService.rejectApproval('user cancel', false, false, 'b');

    expect(approval.resolve).not.toHaveBeenCalled();
    expect(approval.reject).not.toHaveBeenCalled();
  });

  it('reports a caller that names no approval, but not an ordinary race', async () => {
    pending('a');

    await notificationService.rejectApproval('user cancel');

    expect(captureException).toHaveBeenCalledTimes(1);
    expect(captureException.mock.calls[0][0].message).toContain(
      'without an approvalId'
    );

    captureException.mockClear();
    await notificationService.rejectApproval('user cancel', false, false, 'b');

    expect(captureException).not.toHaveBeenCalled();
    expect(addBreadcrumb).toHaveBeenCalled();
  });

  it('stops reusing the notification window before it is removed', async () => {
    // requestApproval focuses the existing window for a whitelisted component,
    // so an approval arriving mid-removal must not be sent to a dying window
    let finishRemoval: () => void;
    removeWindow.mockReturnValue(
      new Promise<void>((resolve) => {
        finishRemoval = resolve;
      })
    );
    pending('a');
    (notificationService as any).notifiWindowId = 7;

    const cleared = notificationService.clear();

    expect((notificationService as any).notifiWindowId).toBeNull();
    finishRemoval!();
    await cleared;
    expect(removeWindow).toHaveBeenCalledWith(7);
  });

  it('invalidates in-flight signing when pending consent is cancelled', async () => {
    // a deferred signer parked on SIGN_WAITING_AMOUNTED compares this against
    // the value it captured, so cancelling must move it
    pending('a');
    (notificationService as any).currentRequestDeferFn = jest.fn();
    const before = (notificationService as any).signingSession;

    notificationService.rejectAllApprovals();

    expect((notificationService as any).signingSession).not.toBe(before);
    expect((notificationService as any).currentRequestDeferFn).toBeUndefined();
  });

  it('resolves the approval the caller named', async () => {
    const approval = pending('a');

    await notificationService.resolveApproval({ signed: true }, false, 'a');

    expect(approval.resolve).toHaveBeenCalledWith({ signed: true });
  });
});
