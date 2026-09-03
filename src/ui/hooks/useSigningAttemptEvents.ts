import React, { useEffect, useRef } from 'react';
import eventBus from '@/eventBus';
import { EVENTS } from '@/constant';
import type {
  HardwareOperationRef,
  SigningAttemptFinishedEvent,
  SigningAttemptRef,
} from '@/utils/signingTypes';

type EventCallbacks = {
  onFinished?: (event: SigningAttemptFinishedEvent) => void;
  onHardwareError?: (errorMessage: string) => void;
  onSubmitting?: () => void;
};

type SigningAttemptRefHolder = {
  current: SigningAttemptRef;
};

const sameAttempt = (expected: SigningAttemptRef | undefined, value: unknown) =>
  !!expected &&
  !!value &&
  (value as SigningAttemptRef).flowId === expected.flowId &&
  (value as SigningAttemptRef).attemptId === expected.attemptId;

export const useSigningAttemptEvents = (
  attemptRef: SigningAttemptRefHolder,
  callbacks: EventCallbacks
) => {
  const callbacksRef = useRef(callbacks);
  const finishedAttemptRef = useRef<SigningAttemptRef>();
  callbacksRef.current = callbacks;

  useEffect(() => {
    const onFinished = (data: SigningAttemptFinishedEvent) => {
      if (!sameAttempt(attemptRef.current, data?.attempt)) return;
      if (sameAttempt(finishedAttemptRef.current, data.attempt)) return;
      finishedAttemptRef.current = data.attempt;
      callbacksRef.current.onFinished?.(data);
    };
    const onHardwareError = (data: {
      operation?: HardwareOperationRef;
      errorMsg?: string;
    }) => {
      const operation = data?.operation;
      if (operation?.kind !== 'signing-attempt') return;
      if (!sameAttempt(attemptRef.current, operation.attempt)) return;
      if (data.errorMsg) callbacksRef.current.onHardwareError?.(data.errorMsg);
    };
    const onSubmitting = (data: { attempt: SigningAttemptRef }) => {
      if (!sameAttempt(attemptRef.current, data?.attempt)) return;
      callbacksRef.current.onSubmitting?.();
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

const SigningAttemptEventBridgeMounted = ({
  attempt,
  onHardwareError,
}: {
  attempt: SigningAttemptRef;
  onHardwareError?: (errorMessage: string) => void;
}) => {
  const attemptRef = useRef(attempt);
  attemptRef.current = attempt;
  useSigningAttemptEvents(attemptRef, { onHardwareError });
  return null;
};

export const SigningAttemptEventBridge = ({
  attempt,
  onHardwareError,
}: {
  attempt?: SigningAttemptRef;
  onHardwareError?: (errorMessage: string) => void;
}) => {
  if (!attempt) return null;
  return React.createElement(SigningAttemptEventBridgeMounted, {
    attempt,
    onHardwareError,
  });
};
