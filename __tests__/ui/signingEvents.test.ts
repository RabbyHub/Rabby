import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import eventBus from '@/eventBus';
import { EVENTS } from '@/constant';
import { useApprovalSigning } from '@/ui/hooks/useApprovalSigning';

jest.mock('@/ui/approval/context', () => ({
  useApprovalScope: () => mockScope,
}));
jest.mock('@/ui/utils/WalletContext', () => ({ useWallet: () => mockWallet }));
const mockScope = {
  approval: { approvalId: 'approval-a', component: 'LedgerHardwareWaiting' },
  signingAttempt: 0,
};
const mockWallet = {
  isApprovalCurrent: jest.fn().mockResolvedValue(true),
  signApproval: jest.fn(),
};
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { resolve, promise };
};
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

it('uses local results, isolates progress/retries, and leaves other listeners intact on unmount', async () => {
  const callback = jest.fn();
  const progress = jest.fn();
  const otherWindow = jest.fn();
  const first = deferred<any>();
  const retry = deferred<any>();
  mockWallet.signApproval
    .mockReturnValueOnce(first.promise)
    .mockReturnValueOnce(retry.promise);
  let start!: ReturnType<typeof useApprovalSigning>;
  function Harness() {
    start = useApprovalSigning({ onResult: callback, onSubmitting: progress });
    return null;
  }
  const root = createRoot(document.createElement('div'));
  eventBus.events = {};
  eventBus.addEventListener(EVENTS.TX_SUBMITTING, otherWindow);
  await act(async () => root.render(React.createElement(Harness)));
  await act(async () => {
    expect(await start()).toBe(true);
    expect(await start()).toBe(false);
    eventBus.emit('SIGN_FINISHED', { signingAttempt: 0, success: true });
    eventBus.emit(EVENTS.TX_SUBMITTING, {});
    eventBus.emit(EVENTS.TX_SUBMITTING, { executionId: 'b' });
    eventBus.emit(EVENTS.TX_SUBMITTING, { executionId: 'approval-a:0' });
  });
  expect(callback).not.toHaveBeenCalled();
  expect(progress).toHaveBeenCalledTimes(1);
  await act(async () => {
    expect(
      await Promise.all([start({ type: 'origin' }), start({ type: 'origin' })])
    ).toEqual([true, false]);
  });
  const args = mockWallet.signApproval.mock.calls.at(-1);
  expect(args[0]).toEqual(mockScope.approval);
  expect(args[1]).toBe(1);
  expect(args[2]).toEqual({ type: 'origin' });
  expect(mockWallet.signApproval).toHaveBeenCalledTimes(2);
  await act(async () => {
    first.resolve({ success: true, data: 'old' });
    retry.resolve({ success: true, data: 'new' });
    eventBus.emit(EVENTS.TX_SUBMITTING, { executionId: 'approval-a:0' });
    eventBus.emit(EVENTS.TX_SUBMITTING, {
      executionId: `approval-a:${args[1]}`,
    });
  });
  expect(callback).toHaveBeenCalledTimes(1);
  expect(callback).toHaveBeenCalledWith({ success: true, data: 'new' });
  expect(progress).toHaveBeenCalledTimes(2);
  await act(async () => root.unmount());
  expect(await start({ type: 'origin' })).toBe(false);
  const count = otherWindow.mock.calls.length;
  eventBus.emit(EVENTS.TX_SUBMITTING, { executionId: `approval-a:${args[1]}` });
  expect(otherWindow).toHaveBeenCalledTimes(count + 1);
  expect(mockWallet.signApproval).toHaveBeenCalledTimes(2);
});

it('drops a result if its page unmounts during the async approval check', async () => {
  const result = deferred<any>();
  const check = deferred<boolean>();
  const callback = jest.fn();
  mockWallet.signApproval.mockReturnValueOnce(result.promise);
  let start!: ReturnType<typeof useApprovalSigning>;
  function Harness() {
    start = useApprovalSigning({ onResult: callback });
    return null;
  }
  const root = createRoot(document.createElement('div'));
  await act(async () => root.render(React.createElement(Harness)));
  await act(async () => {
    await start();
  });
  mockWallet.isApprovalCurrent.mockReturnValueOnce(check.promise);
  result.resolve({ success: true, data: 'late' });
  await Promise.resolve();
  await act(async () => root.unmount());
  check.resolve(true);
  await Promise.resolve();
  expect(callback).not.toHaveBeenCalled();
});
