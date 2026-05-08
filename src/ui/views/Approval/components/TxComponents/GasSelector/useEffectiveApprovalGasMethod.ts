import { useEffect, useMemo } from 'react';

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
}) => {
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

  const effectiveApprovalGasMethod = useMemo(
    () =>
      resolveApprovalGasMethod({
        manualGasMethod,
        legacyGasMethod: gasMethod,
        nativeTokenInsufficient: isGasNotEnough,
        gasAccountChainSupported,
        freeGasAvailable: canUseGasLess,
        noCustomRPC,
        isWalletConnect,
      }),
    [
      canUseGasLess,
      gasAccountChainSupported,
      gasMethod,
      isGasNotEnough,
      manualGasMethod,
      noCustomRPC,
      isWalletConnect,
    ]
  );

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (
      !manualGasMethod &&
      isFirstGasLessLoading &&
      !shouldPreferGasAccountImmediately
    ) {
      return;
    }

    if (gasMethod === effectiveApprovalGasMethod) {
      return;
    }

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
