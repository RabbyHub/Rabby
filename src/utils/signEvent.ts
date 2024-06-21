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

export const emitSignComponentAmounted = () => {
  eventBus.emit(EVENTS.broadcastToBackground, {
    method: EVENTS.SIGN_WAITING_AMOUNTED,
  });
};
