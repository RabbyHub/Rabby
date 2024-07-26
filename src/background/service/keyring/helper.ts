import { EVENTS } from '@/constant';
import eventBus from '@/eventBus';
import * as Sentry from '@sentry/browser';

export const throwError = (error, method = EVENTS.COMMON_HARDWARE.REJECTED) => {
  eventBus.emit(EVENTS.broadcastToUI, {
    method,
    params: error,
  });
  throw new Error(error);
};

export class SignHelper {
  signFn: any;
  errorEventName: string;

  constructor(options: { errorEventName: string }) {
    this.errorEventName = options.errorEventName;
  }

  resend() {
    return this.signFn?.();
  }

  resetResend() {
    this.signFn = undefined;
  }

  async invoke(fn: () => Promise<any>) {
    return new Promise((resolve) => {
      this.signFn = async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (e) {
          Sentry.captureException(e);
          throwError(e?.message ?? e, this.errorEventName);
        }
      };
      this.signFn();
    });
  }
}

export enum LedgerHDPathType {
  LedgerLive = 'LedgerLive',
  Legacy = 'Legacy',
  BIP44 = 'BIP44',
}
