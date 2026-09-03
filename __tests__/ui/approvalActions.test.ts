jest.mock('@/ui/utils/approval-popup', () => ({
  useApprovalPopup: jest.fn(),
}));
jest.mock('@/ui/utils/useDeviceConnect', () => ({
  useDeviceConnect: jest.fn(),
}));
jest.mock('@/ui/utils/WalletContext', () => ({
  useWallet: jest.fn(),
}));

import { createApprovalActions } from '@/ui/approval/actions';
import { toApprovalRef } from '@/utils/signingTypes';

const accepted = { accepted: true } as const;
const stale = {
  accepted: false,
  reason: 'APPROVAL_ID_MISMATCH' as const,
};

describe('approval actions keep the render-scoped id across async work', () => {
  it('sends A after the async step even when B becomes current', async () => {
    let release!: (connected: boolean) => void;
    let currentApprovalId = 'a';
    const deviceConnect = jest.fn(
      () => new Promise<boolean>((resolve) => (release = resolve))
    );
    const resolveApprovalFor = jest.fn(async ({ approval }) =>
      approval.approvalId === currentApprovalId ? accepted : stale
    );
    const onResolved = jest.fn();

    const actions = createApprovalActions({
      approval: toApprovalRef('a', 'SignTx'),
      account: {} as any,
      isCurrent: jest.fn().mockResolvedValue(true),
      deviceConnect,
      resolveApprovalFor,
      rejectApprovalFor: jest.fn(),
      onResolved,
      onRejected: jest.fn(),
    });

    const resultPromise = actions.resolve({ signed: true });
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    currentApprovalId = 'b';
    release(true);

    await expect(resultPromise).resolves.toEqual(stale);
    expect(resolveApprovalFor).toHaveBeenCalledWith({
      approval: toApprovalRef('a', 'SignTx'),
      data: { signed: true },
      forceReject: undefined,
    });
    expect(onResolved).not.toHaveBeenCalled();
  });

  it('drops a stale reject result without navigating to B', async () => {
    let currentApprovalId = 'a';
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const rejectApprovalFor = jest.fn(
      async ({ approval }: { approval: { approvalId: string } }) => {
        await gate;
        return approval.approvalId === currentApprovalId ? accepted : stale;
      }
    );
    const onRejected = jest.fn();
    const actions = createApprovalActions({
      approval: toApprovalRef('a', 'SignTx'),
      account: {} as any,
      isCurrent: jest.fn().mockResolvedValue(true),
      deviceConnect: jest.fn().mockResolvedValue(true),
      resolveApprovalFor: jest.fn(),
      rejectApprovalFor,
      onResolved: jest.fn(),
      onRejected,
    });

    const resultPromise = actions.reject('user cancel');
    currentApprovalId = 'b';
    release();

    await expect(resultPromise).resolves.toEqual(stale);
    expect(rejectApprovalFor).toHaveBeenCalledWith({
      approval: toApprovalRef('a', 'SignTx'),
      error: 'user cancel',
      stay: undefined,
      isInternal: undefined,
    });
    expect(onRejected).not.toHaveBeenCalled();
  });

  it('does not connect a device when the scoped approval is already stale', async () => {
    const deviceConnect = jest.fn().mockResolvedValue(true);
    const actions = createApprovalActions({
      approval: toApprovalRef('a', 'SignTx'),
      account: {} as any,
      isCurrent: jest.fn().mockResolvedValue(false),
      deviceConnect,
      resolveApprovalFor: jest.fn(),
      rejectApprovalFor: jest.fn(),
      onResolved: jest.fn(),
      onRejected: jest.fn(),
    });

    await expect(actions.resolve({ signed: true })).resolves.toEqual(stale);
    expect(deviceConnect).not.toHaveBeenCalled();
  });

  it('does not navigate when the approval becomes stale during device connect', async () => {
    let release!: (connected: boolean) => void;
    const isCurrent = jest
      .fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    const deviceConnect = jest.fn(
      () => new Promise<boolean>((resolve) => (release = resolve))
    );
    const onResolved = jest.fn();
    const actions = createApprovalActions({
      approval: toApprovalRef('a', 'SignTx'),
      account: {} as any,
      isCurrent,
      deviceConnect,
      resolveApprovalFor: jest.fn(),
      rejectApprovalFor: jest.fn(),
      onResolved,
      onRejected: jest.fn(),
    });

    const resultPromise = actions.resolve({ signed: true });
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    release(true);

    await expect(resultPromise).resolves.toEqual(stale);
    expect(onResolved).not.toHaveBeenCalled();
  });
});
