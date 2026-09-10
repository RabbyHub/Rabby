import { useCallback, useEffect, useMemo } from 'react';
import { useMemoizedFn } from 'ahooks';
import { EVENTS } from '@/constant';
import type { SigningResult, SigningRetry } from '@/utils/signingTypes';
import { useApprovalScope } from '@/ui/approval/context';
import { useWallet } from '@/ui/utils/WalletContext';
import { useEventBusListener } from '@/ui/hooks/useEventBusListener';

export const useApprovalSigning = ({
  onResult,
  onSubmitting,
}: {
  onResult: (result: SigningResult) => void;
  onSubmitting?: () => void;
}) => {
  const scope = useApprovalScope();
  const wallet = useWallet();
  const handleResult = useMemoizedFn(onResult);
  const state = useMemo(
    () => ({ attempt: scope.signingAttempt, started: false, mounted: true }),
    [scope.approval.approvalId]
  );
  useEffect(() => {
    state.mounted = true;
    return () => {
      state.mounted = false;
    };
  }, [state]);
  const runIfCurrent = useCallback(
    async (attempt: number | undefined, callback: () => void | boolean) => {
      if (!state.mounted || attempt === undefined || attempt !== state.attempt)
        return false;
      const current = await wallet
        .isApprovalCurrent(scope.approval.approvalId)
        .catch(() => false);
      if (!current || !state.mounted || attempt !== state.attempt) return false;
      return callback() !== false;
    },
    [state, scope.approval.approvalId, wallet]
  );

  // Completion and errors use the RPC promise. Only intermediate progress
  // needs a broadcast, correlated to this attempt.
  useEventBusListener(EVENTS.TX_SUBMITTING, (event) => {
    if (
      state.started &&
      event?.executionId === `${scope.approval.approvalId}:${state.attempt}`
    ) {
      void runIfCurrent(state.attempt, () => onSubmitting?.());
    }
  });

  return useCallback(
    (retry?: SigningRetry) =>
      runIfCurrent(state.attempt, () => {
        if (state.started && !retry) return false;
        const attempt = state.attempt! + (retry ? 1 : 0);
        state.attempt = attempt;
        state.started = true;
        void wallet.signApproval(scope.approval, attempt, retry).then(
          (result) => {
            if (result) void runIfCurrent(attempt, () => handleResult(result));
          },
          (error) => {
            void runIfCurrent(attempt, () =>
              handleResult({ success: false, errorMsg: error.message })
            );
          }
        );
      }),
    [state, scope.approval, wallet, runIfCurrent, handleResult]
  );
};
