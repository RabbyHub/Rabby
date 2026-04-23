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
  isWalletConnect,
}: {
  isReady: boolean;
  isFirstGasLessLoading: boolean;
  isGasNotEnough?: boolean;
  gasAccountChainSupported?: boolean;
  noCustomRPC?: boolean;
  canUseGasLess?: boolean;
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
        isWalletConnect,
      }),
    [
      canUseGasLess,
      gasAccountChainSupported,
      gasMethod,
      isGasNotEnough,
      noCustomRPC,
      isWalletConnect,
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
