import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/shim/with-selector';

import type { SignatureFlowState } from './types';
import type { SignatureManager } from './SignatureManager';

const identity = <T>(value: T) => value;

export const shallowEqual = <T>(left: T, right: T) => {
  if (Object.is(left, right)) {
    return true;
  }

  if (
    !left ||
    !right ||
    typeof left !== 'object' ||
    typeof right !== 'object'
  ) {
    return false;
  }

  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  return leftKeys.every(
    (key) =>
      Object.prototype.hasOwnProperty.call(right, key) &&
      Object.is(
        (left as Record<string, unknown>)[key],
        (right as Record<string, unknown>)[key]
      )
  );
};

export const useSignatureStoreOf = <T = SignatureFlowState>(
  instance: SignatureManager,
  selector?: (state: SignatureFlowState) => T,
  isEqual?: (left: T, right: T) => boolean
) =>
  useSyncExternalStoreWithSelector(
    instance.subscribe,
    instance.getState,
    instance.getState,
    (selector ?? identity) as (state: SignatureFlowState) => T,
    isEqual
  );
