import { EVENTS } from '@/constant';
import eventBus from '@/eventBus';

export const waitSignComponentAmounted = async () => {
  return new Promise<void>((r) =>
    eventBus.once(EVENTS.SIGN_WAITING_AMOUNTED, () => {
      console.log('sign component amounted');
      r();
    })
  );
};

// only work in UI
export const emitSignComponentAmounted = () => {
  // to background
  eventBus.emit(EVENTS.broadcastToBackground, {
    method: EVENTS.SIGN_WAITING_AMOUNTED,
  });
  // to ui
  eventBus.emit(EVENTS.SIGN_WAITING_AMOUNTED);
};
