import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { useApprovalActions } from '@/ui/approval/actions';
import {
  ApprovalScopeContext,
  createApprovalScope,
} from '@/ui/approval/context';
import type { Approval } from '@/background/service/notification';

const mockWallet = {
  getCurrentApproval: jest.fn(),
  resolveApprovalFor: jest.fn(),
  rejectApprovalFor: jest.fn(),
};
const mockDeviceConnect = jest.fn();
const mockHistory = { replace: jest.fn(), push: jest.fn() };
jest.mock('react-router-dom', () => ({ useHistory: () => mockHistory }));
jest.mock('@/ui/utils/WalletContext', () => ({ useWallet: () => mockWallet }));
jest.mock('@/ui/utils/approval-popup', () => ({
  useApprovalPopup: () => ({ showPopup: jest.fn(), enablePopup: () => false }),
}));
jest.mock('@/ui/utils/useDeviceConnect', () => ({
  useDeviceConnect: () => mockDeviceConnect,
}));

const defer = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => (resolve = done));
  return { promise, resolve };
};
const flush = async () => {
  for (let index = 0; index < 5; index++) await Promise.resolve();
};

describe('approval gesture binding', () => {
  let root: Root;
  let actions: ReturnType<typeof useApprovalActions>;
  const approval: Approval = {
    id: 'displayed-request',
    taskId: null,
    winProps: {},
    data: {
      approvalComponent: 'SignTx',
      account: { address: '0xaccount', type: 'HD', brandName: 'HD' },
    },
  };
  const Probe = ({ canResolve }: { canResolve?: () => boolean }) => {
    actions = useApprovalActions(canResolve);
    return null;
  };
  const mount = (canResolve?: () => boolean, scoped = approval) => {
    act(() =>
      root.render(
        React.createElement(
          React.StrictMode,
          null,
          React.createElement(
            ApprovalScopeContext.Provider,
            { value: createApprovalScope(scoped) },
            React.createElement(Probe, { canResolve })
          )
        )
      )
    );
  };
  beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers();
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    root = createRoot(document.createElement('div'));
    mockWallet.getCurrentApproval.mockResolvedValue(approval);
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
    { ...approval, id: 'other-request' },
    {
      ...approval,
      data: { ...approval.data, approvalComponent: 'SignTypedData' },
    },
  ])(
    'refuses a missing, stale or mismatched current approval %j',
    async (current) => {
      mockWallet.getCurrentApproval.mockResolvedValue(current);
      mount();
      expect((await actions.resolve({}))?.accepted).not.toBe(true);
      expect((await actions.reject()).accepted).toBe(false);
      jest.runAllTimers();
      expect(mockWallet.resolveApprovalFor).not.toHaveBeenCalled();
      expect(mockWallet.rejectApprovalFor).not.toHaveBeenCalled();
      expect(mockDeviceConnect).not.toHaveBeenCalled();
      expect(mockHistory.replace).not.toHaveBeenCalled();
      expect(mockHistory.push).not.toHaveBeenCalled();
    }
  );

  test('rechecks the security gate after device connection waits', async () => {
    let allowed = true;
    const connected = defer<boolean>();
    mockDeviceConnect.mockReturnValue(connected.promise);
    mount(() => allowed);
    const pending = actions.resolve({});
    await flush();
    allowed = false;
    connected.resolve(true);
    expect((await pending)?.accepted).not.toBe(true);
    expect(mockWallet.resolveApprovalFor).not.toHaveBeenCalled();
  });

  test.each(['device', 'approval'])(
    'does not resolve after unmount during the %s wait',
    async (stage) => {
      const connected = defer<boolean>();
      const current = defer<Approval>();
      if (stage === 'device')
        mockDeviceConnect.mockReturnValue(connected.promise);
      else mockWallet.getCurrentApproval.mockReturnValue(current.promise);
      mount();
      const pending = actions.resolve({});
      await flush();
      act(() => root.unmount());
      connected.resolve(true);
      current.resolve(approval);
      expect((await pending)?.accepted).not.toBe(true);
      expect(mockWallet.resolveApprovalFor).not.toHaveBeenCalled();
    }
  );

  test('a new valid evaluation cannot revive a submission from an obsolete evaluation', async () => {
    let version = 1;
    const connected = defer<boolean>();
    mockDeviceConnect.mockReturnValue(connected.promise);
    mount(() => version === 1);
    const pending = actions.resolve({});
    await flush();
    version = 2;
    mount(() => version === 2);
    connected.resolve(true);
    expect((await pending)?.accepted).not.toBe(true);
    expect(mockWallet.resolveApprovalFor).not.toHaveBeenCalled();
  });

  test('an ordinary rerender preserves the current evaluation and submission', async () => {
    const connected = defer<boolean>();
    mockDeviceConnect.mockReturnValue(connected.promise);
    mount(() => true);
    const pending = actions.resolve({}, { stay: true });
    await flush();
    mount(() => true);
    connected.resolve(true);
    expect(await pending).toEqual({ accepted: true });
    expect(mockWallet.resolveApprovalFor).toHaveBeenCalledTimes(1);
  });

  test('passes the captured id and component and respects backend refusal', async () => {
    mockWallet.resolveApprovalFor.mockResolvedValue({ accepted: false });
    mount();
    expect((await actions.resolve({}))?.accepted).toBe(false);
    expect(mockWallet.resolveApprovalFor).toHaveBeenCalledWith({
      approval: { approvalId: approval.id, component: 'SignTx' },
      data: {},
      forceReject: undefined,
    });
    jest.runAllTimers();
    expect(mockHistory.replace).not.toHaveBeenCalled();
  });

  test('does not navigate if the request unmounts after backend acceptance', async () => {
    mount();
    expect((await actions.resolve({}))?.accepted).toBe(true);
    act(() => root.unmount());
    jest.runAllTimers();
    expect(mockHistory.replace).not.toHaveBeenCalled();
  });
});
