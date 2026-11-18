import { EVENTS } from '@/constant';
import eventBus from '@/eventBus';

export const waitSignComponentAmounted = (
  signal?: AbortSignal,
  accepts?: (id?: string) => boolean
) =>
  new Promise<void>((resolve, reject) => {
    const mounted = (id?: string) => {
      if (accepts && !accepts(id)) return;
      signal?.removeEventListener('abort', cancel);
      eventBus.removeEventListener(EVENTS.SIGN_WAITING_AMOUNTED, mounted);
      resolve();
    };
    const cancel = () => {
      eventBus.removeEventListener(EVENTS.SIGN_WAITING_AMOUNTED, mounted);
      reject(new Error('Signing request cancelled'));
    };
    if (signal?.aborted) {
      cancel();
      return;
    }
    eventBus.addEventListener(EVENTS.SIGN_WAITING_AMOUNTED, mounted);
    signal?.addEventListener('abort', cancel, { once: true });
  });

// only work in UI
export const emitSignComponentAmounted = (id?: string) => {
  // to background
  eventBus.emit(EVENTS.broadcastToBackground, {
    method: EVENTS.SIGN_WAITING_AMOUNTED,
    data: id,
  });
  // to ui
  eventBus.emit(EVENTS.SIGN_WAITING_AMOUNTED, id);
};
