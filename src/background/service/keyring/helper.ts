import { EVENTS } from '@/constant';
import eventBus from '@/eventBus';
import * as Sentry from '@sentry/browser';

export const throwError = (error, method = EVENTS.COMMON_HARDWARE.REJECTED) => {
  eventBus.emit(EVENTS.broadcastToUI, {
    method,
    params: error,
  });
};

export enum LedgerHDPathType {
  LedgerLive = 'LedgerLive',
  Legacy = 'Legacy',
  BIP44 = 'BIP44',
}
