import { EVENTS } from '@/constant';
import eventBus from '@/eventBus';
import * as Sentry from '@sentry/browser';

export const throwError = (error, method = EVENTS.COMMON_HARDWARE.REJECTED) => {
  eventBus.emit(EVENTS.broadcastToUI, {
    method,
    params: error,
  });
};

/**
 * @deprecated
 */
export class SignHelper {
  signFn: any;
  errorEventName: string;

  constructor(options: { errorEventName: string }) {
    this.errorEventName = options.errorEventName;
  }

  async invoke(fn: () => Promise<any>) {
    return fn();
  }
}

export enum LedgerHDPathType {
  LedgerLive = 'LedgerLive',
  Legacy = 'Legacy',
  BIP44 = 'BIP44',
}
