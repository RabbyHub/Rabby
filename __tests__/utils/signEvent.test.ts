import eventBus from '@/eventBus';
import { EVENTS } from '@/constant';
import {
  notifySigningUiReady,
  getSignEventErrorMessage,
  emitSigningAttemptFinished,
} from '@/utils/signEvent';
import { toSigningAttemptRef } from '@/utils/signingTypes';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { useSigningAttemptEvents } from '@/ui/hooks/useSigningAttemptEvents';

(global as any).IS_REACT_ACT_ENVIRONMENT = true;

describe('scoped signing readiness events', () => {
  it('accepts the submitting attempt payload and ignores other attempts', () => {
    const attempt = toSigningAttemptRef('flow-a', 'attempt-a');
    const onSubmitting = jest.fn();
    const Consumer = () => {
      const ref = React.useRef(attempt);
      useSigningAttemptEvents(ref, { onSubmitting });
      return null;
    };
    const root = createRoot(document.createElement('div'));
    act(() => root.render(React.createElement(Consumer)));
    try {
      eventBus.emit(EVENTS.TX_SUBMITTING, toSigningAttemptRef('flow-a', 'old'));
      eventBus.emit(EVENTS.TX_SUBMITTING, undefined);
      expect(onSubmitting).not.toHaveBeenCalled();
      eventBus.emit(EVENTS.TX_SUBMITTING, attempt);
      expect(onSubmitting).toHaveBeenCalledTimes(1);
      expect(onSubmitting).toHaveBeenCalledWith(attempt);
    } finally {
      act(() => root.unmount());
    }
  });
  beforeEach(() => {
    eventBus.removeAllEventListeners(EVENTS.broadcastToBackground);
    eventBus.removeAllEventListeners(EVENTS.broadcastToUI);
  });

  afterEach(() => {
    eventBus.removeAllEventListeners(EVENTS.broadcastToBackground);
    eventBus.removeAllEventListeners(EVENTS.broadcastToUI);
  });

  it('broadcasts the signing attempt to the background', () => {
    const background = jest.fn();
    eventBus.addEventListener(EVENTS.broadcastToBackground, background);

    const attempt = toSigningAttemptRef('flow-a', 'attempt-a');
    notifySigningUiReady(attempt);

    expect(background).toHaveBeenCalledWith({
      method: EVENTS.SIGN_WAITING_AMOUNTED,
      data: attempt,
    });
  });

  it('keeps legacy error consumers compatible with identity-bearing payloads', () => {
    expect(
      getSignEventErrorMessage({
        errorMsg: 'No OneKey Device found',
        flowId: 'flow-a',
        attemptId: 'attempt-a',
      })
    ).toBe('No OneKey Device found');
    expect(getSignEventErrorMessage('DISCONNECTED')).toBe('DISCONNECTED');
  });

  it('emits completion failures under the shared error field', () => {
    const ui = jest.fn();
    eventBus.addEventListener(EVENTS.broadcastToUI, ui);
    const attempt = toSigningAttemptRef('flow-a', 'attempt-a');

    emitSigningAttemptFinished({
      attempt,
      success: false,
      error: new Error('sign failed'),
    });

    expect(ui).toHaveBeenCalledWith({
      method: EVENTS.SIGN_FINISHED,
      params: {
        attempt,
        success: false,
        error: 'sign failed',
      },
    });
  });
});

test('approval hardware errors retain attempt identity across the UI broadcast', () => {
  const attempt = toSigningAttemptRef('approval-flow', 'retry');
  const recover = jest.fn();
  const Consumer = () => {
    const ref = React.useRef(attempt);
    useSigningAttemptEvents(ref, { onHardwareError: recover });
    return null;
  };
  const broadcast = ({ method, params }) => eventBus.emit(method, params);
  eventBus.addEventListener(EVENTS.broadcastToUI, broadcast);
  const root = createRoot(document.createElement('div'));
  act(() => root.render(React.createElement(Consumer)));
  try {
    const failure = (eventAttempt) =>
      emitSigningAttemptFinished({
        attempt: eventAttempt,
        success: false,
        error: Object.assign(new Error('0x5515'), {
          method: EVENTS.COMMON_HARDWARE.REJECTED,
        }),
      });
    eventBus.emit(EVENTS.COMMON_HARDWARE.REJECTED, { errorMsg: '0x5515' });
    failure(toSigningAttemptRef('approval-flow', 'old'));
    failure(toSigningAttemptRef('other-flow', 'retry'));
    expect(recover).not.toHaveBeenCalled();
    failure(attempt);
    expect(recover).toHaveBeenCalledTimes(1);
    expect(recover).toHaveBeenCalledWith('0x5515', attempt);
  } finally {
    act(() => root.unmount());
    eventBus.removeEventListener(EVENTS.broadcastToUI, broadcast);
  }
});
