import { useEffect, useMemo } from 'react';
import eventBus from '@/eventBus';
import { EVENTS } from '@/constant';
import { emitSignComponentAmounted } from '@/utils/signEvent';
import type { SigningEvent, SigningRetry } from '@/utils/signingTypes';
import { useApprovalScope } from '@/ui/approval/context';
import { useWallet } from '@/ui/utils/WalletContext';

export const useSigningEvents = () => {
  const scope = useApprovalScope();
  const wallet = useWallet();
  const events = useMemo(() => {
    let executionId = scope.executionId;
    let mounted = true;
    let finishedId: string | undefined;
    const cleanups: (() => void)[] = [];
    const isCurrent = async (id = executionId) => {
      if (!mounted || !id || id !== executionId) return false;
      const current = await wallet.isApprovalCurrent(scope.approval.approvalId);
      return current && mounted && id === executionId;
    };
    return {
      listen: (
        method: string,
        callback: (
          event: SigningEvent,
          isCurrent: () => Promise<boolean>
        ) => void | Promise<void>
      ) => {
        if (!mounted) return;
        const listener = async (data: SigningEvent) => {
          const id = executionId;
          if (!id || data?.executionId !== id || !(await isCurrent(id))) return;
          if (method === EVENTS.SIGN_FINISHED) {
            if (finishedId === id) return;
            finishedId = id;
          }
          await callback(data, () => isCurrent(id));
        };
        eventBus.addEventListener(method, listener);
        cleanups.push(() => eventBus.removeEventListener(method, listener));
      },
      ready: () => {
        if (mounted) emitSignComponentAmounted(executionId);
      },
      retry: async (retry?: SigningRetry) => {
        const previous = executionId;
        if (!previous || !(await isCurrent(previous))) return false;
        // Ignore the previous attempt even while the retry RPC is in flight.
        executionId = undefined;
        const next = await wallet.resendSign(scope.approval, previous, retry);
        if (!mounted || !next) return false;
        executionId = next;
        return true;
      },
      mount: () => {
        mounted = true;
      },
      dispose: () => {
        mounted = false;
        cleanups.splice(0).forEach((cleanup) => cleanup());
      },
    };
  }, [scope.approval.approvalId, wallet]);
  useEffect(() => {
    events.mount();
    return events.dispose;
  }, [events]);
  return events;
};
