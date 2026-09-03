import { EVENTS } from '@/constant';
import eventBus from '@/eventBus';
import { ethErrors } from 'eth-rpc-errors';
import { HardwareOperationRef, SigningAttemptRef } from './signingTypes';

export type SigningAttempt = SigningAttemptRef;

const matches = (left: SigningAttemptRef, right: unknown) =>
  !!right &&
  (right as SigningAttemptRef).flowId === left.flowId &&
  (right as SigningAttemptRef).attemptId === left.attemptId;

export const getSignEventErrorMessage = (data: unknown) =>
  typeof data === 'string'
    ? data
    : (data as any)?.errorMsg || (data as any)?.message || String(data || '');

export const waitForSigningUi = (attempt: SigningAttemptRef) => {
  return new Promise<void>((resolve, reject) => {
    const removeListeners = () => {
      eventBus.removeEventListener(EVENTS.SIGN_WAITING_AMOUNTED, onAmounted);
      eventBus.removeEventListener(EVENTS.SIGN_WAITING_CANCELLED, onCancelled);
    };
    const onAmounted = (data: any) => {
      if (!matches(attempt, data)) return;
      removeListeners();
      resolve();
    };
    const onCancelled = (data: any) => {
      if (!matches(attempt, data)) return;
      removeListeners();
      reject(ethErrors.provider.userRejectedRequest());
    };

    eventBus.addEventListener(EVENTS.SIGN_WAITING_AMOUNTED, onAmounted);
    eventBus.addEventListener(EVENTS.SIGN_WAITING_CANCELLED, onCancelled);
  });
};

export const cancelSignComponentWaiting = (attempt: SigningAttemptRef) => {
  eventBus.emit(EVENTS.SIGN_WAITING_CANCELLED, attempt);
};

export const notifySigningUiReady = (attempt: SigningAttemptRef) => {
  eventBus.emit(EVENTS.broadcastToBackground, {
    method: EVENTS.SIGN_WAITING_AMOUNTED,
    data: attempt,
  });
  eventBus.emit(EVENTS.SIGN_WAITING_AMOUNTED, attempt);
};

export const emitHardwareOperationRejected = (
  operation: HardwareOperationRef,
  error: unknown
) => {
  eventBus.emit(EVENTS.COMMON_HARDWARE.REJECTED, {
    operation,
    errorMsg: getSignEventErrorMessage(error),
  });
};

export const emitSigningAttemptFinished = (event: {
  attempt: SigningAttemptRef;
  success: boolean;
  data?: unknown;
  error?: unknown;
}) => {
  const errorMsg =
    event.error instanceof Error
      ? event.error.message
      : String((event.error as any)?.message || event.error || '');

  if (
    !event.success &&
    (event.error as any)?.method === EVENTS.COMMON_HARDWARE.REJECTED
  ) {
    const operation = {
      kind: 'signing-attempt' as const,
      attempt: event.attempt,
    };
    emitHardwareOperationRejected(operation, errorMsg);
    eventBus.emit(EVENTS.broadcastToUI, {
      method: EVENTS.COMMON_HARDWARE.REJECTED,
      params: { operation, errorMsg },
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
