import { EVENTS } from '@/constant';
import { BROADCAST_TO_UI_EVENTS_PAYLOAD } from '@/utils/broadcastToUI';
import eventBus from '@/eventBus';

export function syncStateToUI<T extends keyof BROADCAST_TO_UI_EVENTS_PAYLOAD>(
  event: T,
  payload: BROADCAST_TO_UI_EVENTS_PAYLOAD[T]
) {
  eventBus.emit(EVENTS.broadcastToUI, {
    method: event,
    params: payload,
  });
}
