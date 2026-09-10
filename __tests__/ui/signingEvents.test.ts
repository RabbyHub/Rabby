import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import eventBus from '@/eventBus';
import { EVENTS } from '@/constant';
import { useSigningEvents } from '@/ui/hooks/useSigningEvents';

jest.mock('@/ui/approval/context', () => ({
  useApprovalScope: () => mockScope,
}));
jest.mock('@/ui/utils/WalletContext', () => ({ useWallet: () => mockWallet }));
const mockScope = {
  approval: { approvalId: 'approval-a', component: 'LedgerHardwareWaiting' },
  executionId: 'a-1',
};
const mockWallet = {
  isApprovalCurrent: jest.fn().mockResolvedValue(true),
  resendSign: jest.fn().mockResolvedValue('a-2'),
};
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

it('ignores foreign, unscoped, duplicate and old-retry events, and cleans up only its own listeners', async () => {
  let events!: ReturnType<typeof useSigningEvents>;
  const callback = jest.fn();
  const otherWindow = jest.fn();
  function Harness() {
    events = useSigningEvents();
    return null;
  }
  const root = createRoot(document.createElement('div'));
  eventBus.events = {};
  eventBus.addEventListener(EVENTS.SIGN_FINISHED, otherWindow);
  await act(async () => root.render(React.createElement(Harness)));
  events.listen(EVENTS.SIGN_FINISHED, callback);
  const emit = (executionId?: string) =>
    eventBus.emit(EVENTS.SIGN_FINISHED, { executionId, success: true });
  await act(async () => {
    emit('b-1');
    emit();
  });
  expect(callback).not.toHaveBeenCalled();
  await act(async () => {
    emit('a-1');
    emit('a-1');
  });
  expect(callback).toHaveBeenCalledTimes(1);
  await act(async () => {
    expect(await events.retry()).toBe(true);
    emit('a-1');
    emit('a-2');
  });
  expect(callback).toHaveBeenCalledTimes(2);
  expect(mockWallet.resendSign).toHaveBeenCalledWith(
    mockScope.approval,
    'a-1',
    undefined
  );
  await act(async () => root.unmount());
  const count = otherWindow.mock.calls.length;
  events.listen(EVENTS.SIGN_FINISHED, callback); // an init() completing after unmount
  emit('a-2');
  await Promise.resolve();
  expect(callback).toHaveBeenCalledTimes(2);
  expect(otherWindow).toHaveBeenCalledTimes(count + 1);
});

it('does not continue after the approval is replaced during its async identity check', async () => {
  let events!: ReturnType<typeof useSigningEvents>;
  let finishCheck!: (value: boolean) => void;
  mockWallet.isApprovalCurrent.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finishCheck = resolve;
      })
  );
  function Harness() {
    events = useSigningEvents();
    return null;
  }
  const callback = jest.fn();
  const root = createRoot(document.createElement('div'));
  await act(async () => root.render(React.createElement(Harness)));
  events.listen(EVENTS.SIGN_FINISHED, callback);
  eventBus.emit(EVENTS.SIGN_FINISHED, { executionId: 'a-1' });
  await act(async () => root.unmount());
  finishCheck(true);
  await Promise.resolve();
  await Promise.resolve();
  expect(callback).not.toHaveBeenCalled();
});
