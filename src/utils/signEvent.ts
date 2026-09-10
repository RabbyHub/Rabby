import { EVENTS } from '@/constant';
import eventBus from '@/eventBus';
import type { SigningAttemptRef } from './signingTypes';

export const getSignEventErrorMessage = (data: unknown) =>
  typeof data === 'string'
    ? data
    : (data as any)?.errorMsg || (data as any)?.message || String(data || '');

export const notifySigningUiReady = (attempt: SigningAttemptRef) => {
  eventBus.emit(EVENTS.broadcastToBackground, {
    method: EVENTS.SIGN_WAITING_AMOUNTED,
    data: attempt,
  });
};

export const emitSigningAttemptFinished = (event: {
  attempt: SigningAttemptRef;
  success: boolean;
  data?: unknown;
  error?: unknown;
}) => {
  const errorMsg = getSignEventErrorMessage(event.error);

  if (
    !event.success &&
    (event.error as any)?.method === EVENTS.COMMON_HARDWARE.REJECTED
  ) {
    eventBus.emit(EVENTS.broadcastToUI, {
      method: EVENTS.COMMON_HARDWARE.REJECTED,
      params: { attempt: event.attempt, errorMsg },
    });
  }

  eventBus.emit(EVENTS.broadcastToUI, {
    method: EVENTS.SIGN_FINISHED,
    params: {
      attempt: event.attempt,
      success: event.success,
      ...(event.success ? { data: event.data } : { error: errorMsg }),
    },
  });
};
