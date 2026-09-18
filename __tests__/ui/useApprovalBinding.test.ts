import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { useApproval, ApprovalBinding } from '@/ui/utils/hooks';

const mockWallet = {
  getApproval: jest.fn(),
  resolveApprovalFor: jest.fn(),
  rejectApprovalFor: jest.fn(),
  coboSafeResetCurrentAccount: jest.fn(),
};
const mockDeviceConnect = jest.fn();
const mockHistory = { replace: jest.fn(), push: jest.fn() };

jest.mock('react-router-dom', () => ({ useHistory: () => mockHistory }));
jest.mock('@/ui/utils/WalletContext', () => ({ useWallet: () => mockWallet }));
jest.mock('@/constant', () => ({ KEYRING_CLASS: {}, KEYRING_TYPE: {} }));
jest.mock('@/ui/utils/ledger', () => ({}));
jest.mock('@/ui/utils/approval-popup', () => ({
  useApprovalPopup: () => ({ showPopup: jest.fn(), enablePopup: () => false }),
}));
jest.mock('@/ui/store', () => ({}));
jest.mock('react-i18next', () => ({}));
jest.mock('@/ui/utils/useDeviceConnect', () => ({
  useDeviceConnect: () => mockDeviceConnect,
}));
jest.mock('@/ui/state/exchange', () => ({}));

describe('approval gesture binding', () => {
  let container: HTMLDivElement;
  let root: Root;
  let approvalHook: ReturnType<typeof useApproval>;
  const approval = {
    id: 'displayed-request',
    data: { approvalComponent: 'SignTx', account: { address: '0xaccount' } },
  };
  const Probe = ({ binding }: { binding: ApprovalBinding | null }) => {
    approvalHook = useApproval(binding);
    return null;
  };
  const mount = (binding: ApprovalBinding | null = null) => {
    act(() => root.render(React.createElement(Probe, { binding })));
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    root = createRoot(container);
    mockWallet.getApproval.mockResolvedValue(approval);
    mockWallet.resolveApprovalFor.mockResolvedValue({ accepted: true });
    mockWallet.rejectApprovalFor.mockResolvedValue({ accepted: true });
    mockDeviceConnect.mockResolvedValue(true);
  });

  afterEach(() => {
    act(() => root.unmount());
    delete (globalThis as any).IS_REACT_ACT_ENVIRONMENT;
    jest.useRealTimers();
  });

  test.each([
    null,
    { approvalId: 'old-request', approvalComponent: 'SignTx' as const },
    {
      approvalId: 'displayed-request',
      approvalComponent: 'SignTypedData' as const,
    },
  ])('refuses missing/stale/mismatched binding %j', async (binding) => {
    mount(binding);
    expect(await approvalHook[1]({})).toBe(false);
    expect(await approvalHook[2]()).toBe(false);
    jest.runAllTimers();
    expect(mockWallet.resolveApprovalFor).not.toHaveBeenCalled();
    expect(mockWallet.rejectApprovalFor).not.toHaveBeenCalled();
    expect(mockDeviceConnect).not.toHaveBeenCalled();
    expect(mockHistory.replace).not.toHaveBeenCalled();
    expect(mockHistory.push).not.toHaveBeenCalled();
  });

  test('rechecks the security gate after device connection waits', async () => {
    let allowed = true;
    let finishConnect!: (connected: boolean) => void;
    mockDeviceConnect.mockImplementation(
      () =>
        new Promise((resolve) => {
          finishConnect = resolve;
        })
    );
    mount({
      approvalId: approval.id,
      approvalComponent: 'SignTx',
      canResolve: () => allowed,
    });
    const pending = approvalHook[1]({});
    await Promise.resolve();
    allowed = false;
    finishConnect(true);
    expect(await pending).toBe(false);
    expect(mockWallet.resolveApprovalFor).not.toHaveBeenCalled();
  });

  test('does not resolve after its displayed request unmounts', async () => {
    let finishConnect!: (connected: boolean) => void;
    mockDeviceConnect.mockImplementation(
      () =>
        new Promise((resolve) => {
          finishConnect = resolve;
        })
    );
    mount({ approvalId: approval.id, approvalComponent: 'SignTx' });
    const pending = approvalHook[1]({});
    await Promise.resolve();
    act(() => root.unmount());
    finishConnect(true);
    expect(await pending).toBe(false);
    expect(mockWallet.resolveApprovalFor).not.toHaveBeenCalled();
  });

  test('a new valid evaluation cannot revive a submission from an obsolete evaluation', async () => {
    let version = 1;
    let finishConnect!: (connected: boolean) => void;
    mockDeviceConnect.mockImplementation(
      () =>
        new Promise((resolve) => {
          finishConnect = resolve;
        })
    );
    mount({
      approvalId: approval.id,
      approvalComponent: 'SignTx',
      canResolve: () => version === 1,
    });
    const pending = approvalHook[1]({});
    await Promise.resolve();
    version = 2;
    mount({
      approvalId: approval.id,
      approvalComponent: 'SignTx',
      canResolve: () => version === 2,
    });
    finishConnect(true);
    expect(await pending).toBe(false);
    expect(mockWallet.resolveApprovalFor).not.toHaveBeenCalled();
  });

  test('passes the bound ref as an object, and does not navigate when the backend refuses a stale gesture', async () => {
    mockWallet.resolveApprovalFor.mockResolvedValue({
      accepted: false,
      reason: 'APPROVAL_ID_MISMATCH',
    });
    mount({ approvalId: approval.id, approvalComponent: 'SignTx' });
    expect(await approvalHook[1]({})).toBe(false);
    expect(mockWallet.resolveApprovalFor).toHaveBeenCalledWith({
      approval: { id: approval.id, component: 'SignTx' },
      data: {},
      forceReject: false,
    });
    jest.runAllTimers();
    expect(mockHistory.replace).not.toHaveBeenCalled();
  });

  test('a null binding (no scope/ref established) fails closed for both resolve and reject, never falling back to current', async () => {
    mount(null);
    expect(await approvalHook[1]({}, true)).toBe(false);
    expect(await approvalHook[2](undefined, true)).toBe(false);
    expect(mockWallet.resolveApprovalFor).not.toHaveBeenCalled();
    expect(mockWallet.rejectApprovalFor).not.toHaveBeenCalled();
    // getApproval() itself is a harmless read and remains available.
    expect(mockWallet.getApproval).not.toHaveBeenCalled();
  });

  test('reject is not gated by the extra canResolve readiness check, only by ownership', async () => {
    mount({
      approvalId: approval.id,
      approvalComponent: 'SignTx',
      canResolve: () => false,
    });
    expect(await approvalHook[2]('user cancel')).toBe(true);
    expect(mockWallet.rejectApprovalFor).toHaveBeenCalledWith({
      approval: { id: approval.id, component: 'SignTx' },
      error: 'user cancel',
      stay: false,
      isInternal: false,
    });
  });
});
