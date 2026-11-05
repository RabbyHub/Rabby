import * as Sentry from '@sentry/browser';
import { EVENTS } from '@/constant';
import eventBus from '@/eventBus';
import {
  isWalletConnectClockSkewError,
  WALLETCONNECT_CLOCK_SKEW,
} from '@/utils/walletconnect-error';

let clockSkewErrorCode: typeof WALLETCONNECT_CLOCK_SKEW | undefined;

export const getWalletConnectTransportErrorCode = () => clockSkewErrorCode;

export const clearWalletConnectTransportError = () => {
  clockSkewErrorCode = undefined;
};

export const reportWalletConnectTransportError = (error: unknown) => {
  const isClockSkew = isWalletConnectClockSkewError(error);
  if (isClockSkew) {
    clockSkewErrorCode = WALLETCONNECT_CLOCK_SKEW;
  }
  Sentry.captureException(
    isClockSkew ? error : new Error('Transport error: ' + JSON.stringify(error))
  );
  eventBus.emit(EVENTS.broadcastToUI, {
    method: EVENTS.WALLETCONNECT.TRANSPORT_ERROR,
    // The device clock warning applies to every WalletConnect connection on
    // this computer. It carries no account, request or signing consent.
    params: isClockSkew ? { code: WALLETCONNECT_CLOCK_SKEW } : error,
  });
};
