import { useEffect } from 'react';
import { useSyncExternalStore } from 'use-sync-external-store/shim';

let gasAccountDepositFlowActiveCount = 0;
const listeners = new Set<() => void>();

const emitChange = () => {
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = () => gasAccountDepositFlowActiveCount > 0;

export const isGasAccountDepositFlowActive = () => getSnapshot();

export const useGasAccountDepositFlowActive = () =>
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

export const useGasAccountDepositFlowRuntimeGuard = (visible?: boolean) => {
  useEffect(() => {
    if (!visible) {
      return;
    }

    gasAccountDepositFlowActiveCount += 1;
    emitChange();

    return () => {
      gasAccountDepositFlowActiveCount = Math.max(
        0,
        gasAccountDepositFlowActiveCount - 1
      );
      emitChange();
    };
  }, [visible]);
};
