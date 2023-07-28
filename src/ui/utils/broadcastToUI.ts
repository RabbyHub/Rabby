import eventBus from '@/eventBus';
import {
  BROADCAST_TO_UI_EVENTS,
  BROADCAST_TO_UI_EVENTS_PAYLOAD,
  IDisposeFunc,
} from '@/utils/broadcastToUI';

export function onBroadcastToUI<T extends BROADCAST_TO_UI_EVENTS>(
  event: T,
  listener: (payload: BROADCAST_TO_UI_EVENTS_PAYLOAD[T]) => void
): IDisposeFunc {
  eventBus.addEventListener(event, listener);

  return () => {
    eventBus.removeEventListener(event, listener);
  };
}
