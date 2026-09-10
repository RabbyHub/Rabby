jest.mock('@/ui/utils/approval-popup', () => ({
  useApprovalPopup: jest.fn(),
}));
jest.mock('@/ui/utils/useDeviceConnect', () => ({
  useDeviceConnect: jest.fn(),
}));
jest.mock('@/ui/utils/WalletContext', () => ({
  useWallet: jest.fn(),
  useCommonPopupView: jest.fn(),
}));
jest.mock('react-router-dom', () => ({ useHistory: jest.fn() }));
jest.mock('@/ui/store', () => ({}));
jest.mock('@/ui/state/exchange', () => ({}));
jest.mock('@/ui/utils/ledger', () => ({}));
jest.mock('@/constant', () => ({}));

import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import type { Approval } from '@/background/service/notification';
import { ApprovalScopeContext } from '@/ui/approval/context';
import { useApproval } from '@/ui/utils/hooks';
import { useWallet, useCommonPopupView } from '@/ui/utils/WalletContext';
import { useApprovalPopup } from '@/ui/utils/approval-popup';
import { useDeviceConnect } from '@/ui/utils/useDeviceConnect';
import { useHistory } from 'react-router-dom';

const a = {
  id: 'a',
  data: { approvalComponent: 'SignTx', account: { address: '0xa' } },
} as Approval;
const b = { ...a, id: 'b' };
const accepted = { accepted: true } as const;
const stale = { accepted: false, reason: 'APPROVAL_ID_MISMATCH' } as const;
let current: Approval | null;
let root: Root;
let actions: ReturnType<typeof useApproval>;
const wallet = {
  getCurrentApproval: jest.fn(async () => current),
  isApprovalCurrent: jest.fn(async (id: string) => id === current?.id),
  resolveApprovalFor: jest.fn(async () => accepted as any),
  rejectApprovalFor: jest.fn(async () => accepted as any),
};
const history = { push: jest.fn(), replace: jest.fn() };
const connect = jest.fn(async () => true);
const showPopup = jest.fn();

function Probe() {
  actions = useApproval();
  return null;
}
function render(approval: Approval | null = a) {
  act(() => {
    root.render(
      React.createElement(
        ApprovalScopeContext.Provider,
        { value: approval },
        React.createElement(Probe)
      )
    );
  });
}

beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  jest.clearAllMocks();
  current = a;
  root = createRoot(document.createElement('div'));
  jest.mocked(useWallet).mockReturnValue(wallet as any);
  jest.mocked(useCommonPopupView).mockReturnValue({} as any);
  jest.mocked(useHistory).mockReturnValue(history as any);
  jest.mocked(useApprovalPopup).mockReturnValue({
    showPopup,
    enablePopup: () => true,
  });
  jest.mocked(useDeviceConnect).mockReturnValue(connect);
});
afterEach(() => {
  act(() => root.unmount());
});

test('both actions send the rendered id and component', async () => {
  render();
  expect(await actions[3]()).toBe(true);
  await actions[1]({ signed: true }, true);
  await actions[2]('cancel', true);
  expect(wallet.resolveApprovalFor).toHaveBeenCalledWith({
    approval: { approvalId: 'a', component: 'SignTx' },
    data: { signed: true },
    forceReject: false,
  });
  expect(wallet.rejectApprovalFor).toHaveBeenCalledWith({
    approval: { approvalId: 'a', component: 'SignTx' },
    error: 'cancel',
    stay: true,
    isInternal: false,
  });
});

test('a callback captured on A cannot act on B after rerender', async () => {
  render();
  const old = actions;
  current = b;
  render(b);
  await old[1]({ signed: true });
  await old[2]('cancel');
  expect(await old[3]()).toBe(false);
  expect(await actions[3]()).toBe(true);
  expect(connect).not.toHaveBeenCalled();
  expect(wallet.resolveApprovalFor).not.toHaveBeenCalled();
  expect(wallet.rejectApprovalFor).not.toHaveBeenCalled();
});

test('does not connect or settle after an explicit id or component mismatch', async () => {
  render();
  await actions[1]({}, false, false, 'b');
  await actions[2]('cancel', false, false, 'b');
  current = { ...a, data: { ...a.data, approvalComponent: 'Connect' } };
  await actions[1]({});
  await actions[2]('cancel');
  expect(await actions[3]()).toBe(false);
  expect(connect).not.toHaveBeenCalled();
  expect(wallet.resolveApprovalFor).not.toHaveBeenCalled();
  expect(wallet.rejectApprovalFor).not.toHaveBeenCalled();
});

test('does not settle or navigate if A is replaced during device connection', async () => {
  render();
  let release!: (connected: boolean) => void;
  const started = new Promise<void>((ready) => {
    connect.mockImplementationOnce(() => {
      ready();
      return new Promise<boolean>((resolve) => (release = resolve));
    });
  });
  const result = actions[1]({ signed: true });
  await started;
  current = b;
  release(true);
  await result;
  expect(wallet.resolveApprovalFor).not.toHaveBeenCalled();
  expect(history.replace).not.toHaveBeenCalled();
  expect(showPopup).not.toHaveBeenCalled();
});

test('does not navigate when the backend rejects a stale action', async () => {
  render();
  wallet.resolveApprovalFor.mockResolvedValueOnce(stale);
  wallet.rejectApprovalFor.mockResolvedValueOnce(stale);
  await actions[1]({ signed: true });
  await actions[2]('cancel');
  expect(history.replace).not.toHaveBeenCalled();
  expect(history.push).not.toHaveBeenCalled();
  expect(showPopup).not.toHaveBeenCalled();
});

test('an unbound device popup cannot operate on the current approval', async () => {
  jest
    .mocked(useCommonPopupView)
    .mockReturnValue({ componentName: 'Ledger' } as any);
  render(null);
  expect(await actions[0]()).toBeUndefined();
  await actions[1]({});
  await actions[2]('cancel');
  expect(wallet.resolveApprovalFor).not.toHaveBeenCalled();
  expect(wallet.rejectApprovalFor).not.toHaveBeenCalled();
});

test('a device popup retains its originating approval id', async () => {
  jest
    .mocked(useCommonPopupView)
    .mockReturnValue({ componentName: 'Ledger', approvalId: 'a' } as any);
  render(null);
  await actions[2]('cancel', true);
  expect(wallet.rejectApprovalFor).toHaveBeenCalledWith(
    expect.objectContaining({
      approval: { approvalId: 'a', component: 'SignTx' },
    })
  );
  wallet.rejectApprovalFor.mockClear();
  current = b;
  await actions[2]('cancel', true);
  expect(wallet.rejectApprovalFor).not.toHaveBeenCalled();
});

test('read-only callers can read current approval, but actions require a captured id', async () => {
  render(null);
  expect(await actions[0]()).toBe(a);
  await actions[1]();
  await actions[2]();
  expect(wallet.resolveApprovalFor).not.toHaveBeenCalled();
  expect(wallet.rejectApprovalFor).not.toHaveBeenCalled();
  await actions[1](undefined, true, false, a.id);
  expect(wallet.resolveApprovalFor).toHaveBeenCalledWith(
    expect.objectContaining({
      approval: { approvalId: 'a', component: 'SignTx' },
    })
  );
});
