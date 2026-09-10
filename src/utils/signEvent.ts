import { EVENTS } from '@/constant';
import eventBus from '@/eventBus';
import { ethErrors } from 'eth-rpc-errors';

export const waitSignComponentAmounted = (
  executionId: string,
  signal: AbortSignal
) =>
  new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      eventBus.removeEventListener(EVENTS.SIGN_WAITING_AMOUNTED, onReady);
      signal.removeEventListener('abort', onAbort);
    };
    const onAbort = () => {
      cleanup();
      reject(ethErrors.provider.userRejectedRequest());
    };
    const onReady = (data: { executionId?: string }) => {
      if (!executionId || data?.executionId !== executionId) return;
      cleanup();
      resolve();
    };
    if (signal.aborted || !executionId) return onAbort();
    eventBus.addEventListener(EVENTS.SIGN_WAITING_AMOUNTED, onReady);
    signal.addEventListener('abort', onAbort, { once: true });
  });

// only work in UI
export const emitSignComponentAmounted = (executionId?: string) => {
  if (!executionId) return;
  const params = { executionId };
  eventBus.emit(EVENTS.broadcastToBackground, {
    method: EVENTS.SIGN_WAITING_AMOUNTED,
    params,
  });
  eventBus.emit(EVENTS.SIGN_WAITING_AMOUNTED, params);
};
