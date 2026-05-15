import { useEffect, useMemo, useRef } from 'react';

import {
  resolveApprovalGasMethod,
  shouldAutoSwitchToApprovalGasAccount,
} from './approvalGasDisplay';
import type { ApprovalGasMethod } from './approvalGasDisplay';

export const useEffectiveApprovalGasMethod = ({
  isReady,
  isFirstGasLessLoading,
  isGasNotEnough,
  gasAccountChainSupported,
  noCustomRPC,
  canUseGasLess,
  manualGasMethod,
  gasMethod,
  setGasMethod,
  isWalletConnect,
  autoSwitchKey,
}: {
  isReady: boolean;
  isFirstGasLessLoading: boolean;
  isGasNotEnough?: boolean;
  gasAccountChainSupported?: boolean;
  noCustomRPC?: boolean;
  canUseGasLess?: boolean;
  manualGasMethod?: ApprovalGasMethod;
  gasMethod?: ApprovalGasMethod;
  isWalletConnect: boolean;
  setGasMethod(method: ApprovalGasMethod): void | Promise<void>;
  autoSwitchKey?: string | number;
}) => {
  const didAutoSwitchRef = useRef(false);
  const autoSwitchKeyRef = useRef(autoSwitchKey);

  useEffect(() => {
    if (autoSwitchKeyRef.current === autoSwitchKey) {
      return;
    }
    autoSwitchKeyRef.current = autoSwitchKey;
    didAutoSwitchRef.current = false;
  }, [autoSwitchKey]);

  const shouldPreferGasAccountImmediately = useMemo(
    () =>
      shouldAutoSwitchToApprovalGasAccount({
        nativeTokenInsufficient: isGasNotEnough,
        gasAccountChainSupported,
        freeGasAvailable: canUseGasLess,
        noCustomRPC,
        isWalletConnect,
      }),
    [
      canUseGasLess,
      gasAccountChainSupported,
      isGasNotEnough,
      isWalletConnect,
      noCustomRPC,
    ]
  );

  const effectiveApprovalGasMethod = useMemo(() => {
    if (manualGasMethod) {
      return manualGasMethod;
    }

    return resolveApprovalGasMethod({
      mode: 'native_insufficient_prefers_gasAccount',
      legacyGasMethod: gasMethod,
      nativeTokenInsufficient: isGasNotEnough,
      gasAccountChainSupported,
      freeGasAvailable: canUseGasLess,
      noCustomRPC,
      isWalletConnect,
    });
  }, [
    canUseGasLess,
    gasAccountChainSupported,
    gasMethod,
    isGasNotEnough,
    manualGasMethod,
    noCustomRPC,
    isWalletConnect,
  ]);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (manualGasMethod || didAutoSwitchRef.current) {
      return;
    }

    if (isFirstGasLessLoading && !shouldPreferGasAccountImmediately) {
      return;
    }

    if (gasMethod === effectiveApprovalGasMethod) {
      return;
    }

    didAutoSwitchRef.current = true;
    void setGasMethod(effectiveApprovalGasMethod);
  }, [
    effectiveApprovalGasMethod,
    gasMethod,
    isFirstGasLessLoading,
    isReady,
    manualGasMethod,
    setGasMethod,
    shouldPreferGasAccountImmediately,
  ]);

  return {
    effectiveApprovalGasMethod,
    shouldPreferGasAccountImmediately,
  };
};
