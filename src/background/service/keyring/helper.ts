import { EVENTS } from '@/constant';
import eventBus from '@/eventBus';

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
          throwError(e.message, this.errorEventName);
        }
      };
      this.signFn();
    });
  }
}
