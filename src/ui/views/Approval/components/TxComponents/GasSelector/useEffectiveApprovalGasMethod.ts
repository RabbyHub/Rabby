import { useEffect, useMemo } from 'react';

import {
  ApprovalGasMethod,
  resolveApprovalGasMethod,
  shouldAutoSwitchToApprovalGasAccount,
} from './approvalGasDisplay';

export const useEffectiveApprovalGasMethod = ({
  isReady,
  isFirstGasLessLoading,
  isGasNotEnough,
  gasAccountChainSupported,
  noCustomRPC,
  canUseGasLess,
  gasMethod,
  setGasMethod,
}: {
  isReady: boolean;
  isFirstGasLessLoading: boolean;
  isGasNotEnough?: boolean;
  gasAccountChainSupported?: boolean;
  noCustomRPC?: boolean;
  canUseGasLess?: boolean;
  gasMethod?: ApprovalGasMethod;
  setGasMethod(method: ApprovalGasMethod): void | Promise<void>;
}) => {
  const shouldPreferGasAccountImmediately = useMemo(
    () =>
      shouldAutoSwitchToApprovalGasAccount({
        nativeTokenInsufficient: isGasNotEnough,
        gasAccountChainSupported,
        freeGasAvailable: canUseGasLess,
        noCustomRPC,
      }),
    [canUseGasLess, gasAccountChainSupported, isGasNotEnough, noCustomRPC]
  );

  const effectiveApprovalGasMethod = useMemo(
    () =>
      resolveApprovalGasMethod({
        legacyGasMethod: gasMethod,
        nativeTokenInsufficient: isGasNotEnough,
        gasAccountChainSupported,
        freeGasAvailable: canUseGasLess,
        noCustomRPC,
      }),
    [
      canUseGasLess,
      gasAccountChainSupported,
      gasMethod,
      isGasNotEnough,
      noCustomRPC,
    ]
  );

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (isFirstGasLessLoading && !shouldPreferGasAccountImmediately) {
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
    setGasMethod,
    shouldPreferGasAccountImmediately,
  ]);

  return {
    effectiveApprovalGasMethod,
    shouldPreferGasAccountImmediately,
  };
};
