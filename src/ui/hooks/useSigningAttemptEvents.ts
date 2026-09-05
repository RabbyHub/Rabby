import { useEffect, useRef } from 'react';
import eventBus from '@/eventBus';
import { EVENTS } from '@/constant';
import type {
  HardwareOperationRef,
  SigningAttemptFinishedEvent,
  SigningAttemptRef,
} from '@/utils/signingTypes';
import { sameSigningAttempt } from '@/utils/signingTypes';

type EventCallbacks = {
  onFinished?: (event: SigningAttemptFinishedEvent) => void;
  onHardwareError?: (errorMessage: string, attempt: SigningAttemptRef) => void;
  onSubmitting?: (attempt: SigningAttemptRef) => void;
};

type SigningAttemptRefHolder = {
  current?: SigningAttemptRef;
};

export const useSigningAttemptEvents = (
  attemptRef: SigningAttemptRefHolder,
  callbacks: EventCallbacks
) => {
  const callbacksRef = useRef(callbacks);
  const finishedAttemptRef = useRef<SigningAttemptRef>();
  callbacksRef.current = callbacks;

  useEffect(() => {
    const onFinished = (data: SigningAttemptFinishedEvent) => {
      if (!sameSigningAttempt(attemptRef.current, data?.attempt)) return;
      if (sameSigningAttempt(finishedAttemptRef.current, data.attempt)) return;
      finishedAttemptRef.current = data.attempt;
      callbacksRef.current.onFinished?.(data);
    };
    const onHardwareError = (data: {
      operation: HardwareOperationRef;
      errorMsg: string;
    }) => {
      const operation = data?.operation;
      if (
        operation?.kind !== 'signing-attempt' ||
        !sameSigningAttempt(attemptRef.current, operation.attempt)
      ) {
        return;
      }
      if (data.errorMsg) {
        callbacksRef.current.onHardwareError?.(
          data.errorMsg,
          operation.attempt
        );
      }
    };
    const onSubmitting = (attempt: SigningAttemptRef) => {
      if (!sameSigningAttempt(attemptRef.current, attempt)) return;
      callbacksRef.current.onSubmitting?.(attempt);
    };

    eventBus.addEventListener(EVENTS.SIGN_FINISHED, onFinished);
    eventBus.addEventListener(EVENTS.COMMON_HARDWARE.REJECTED, onHardwareError);
    eventBus.addEventListener(EVENTS.TX_SUBMITTING, onSubmitting);
    return () => {
      eventBus.removeEventListener(EVENTS.SIGN_FINISHED, onFinished);
      eventBus.removeEventListener(
        EVENTS.COMMON_HARDWARE.REJECTED,
        onHardwareError
      );
      eventBus.removeEventListener(EVENTS.TX_SUBMITTING, onSubmitting);
    };
  }, [attemptRef]);
};
