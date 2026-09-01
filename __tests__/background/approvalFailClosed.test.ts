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

jest.mock('background/webapi', () => ({
  winMgr: { event: { on: jest.fn() }, openNotification: jest.fn() },
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
jest.mock('@sentry/browser', () => ({ captureException: jest.fn() }));

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

  it('resolves the approval the caller named', async () => {
    const approval = pending('a');

    await notificationService.resolveApproval({ signed: true }, false, 'a');

    expect(approval.resolve).toHaveBeenCalledWith({ signed: true });
  });
});
