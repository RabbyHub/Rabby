jest.mock('@sentry/browser', () => ({ captureException: jest.fn() }));

import * as Sentry from '@sentry/browser';
import { EVENTS } from '@/constant';
import eventBus from '@/eventBus';
import {
  clearWalletConnectTransportError,
  getWalletConnectTransportErrorCode,
  reportWalletConnectTransportError,
} from '@/background/utils/walletconnectTransportError';
import { WALLETCONNECT_CLOCK_SKEW } from '@/utils/walletconnect-error';

describe('WalletConnect transport error bridge', () => {
  const broadcast = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    clearWalletConnectTransportError();
    eventBus.addEventListener(EVENTS.broadcastToUI, broadcast);
  });

  afterEach(() => {
    eventBus.removeEventListener(EVENTS.broadcastToUI, broadcast);
  });

  it('preserves the diagnostic error and sends only a stable clock warning to UI', () => {
    const error = new Error(
      'WebSocket connection closed abnormally with code: 3000 (JWT validation error: JWT Token is not yet valid: basic.iat: 1791353462, now + time_leeway: 1791353252, time_leeway: 120)'
    );

    reportWalletConnectTransportError(error);

    expect(Sentry.captureException).toHaveBeenCalledWith(error);
    expect(broadcast).toHaveBeenCalledWith({
      method: EVENTS.WALLETCONNECT.TRANSPORT_ERROR,
      params: { code: WALLETCONNECT_CLOCK_SKEW },
    });
    expect(getWalletConnectTransportErrorCode()).toBe(WALLETCONNECT_CLOCK_SKEW);

    clearWalletConnectTransportError();
    expect(getWalletConnectTransportErrorCode()).toBeUndefined();
  });

  it('keeps other transport errors reportable without mislabeling the device clock', () => {
    const data = { event: 'transport_error', params: ['Country is blocked'] };

    reportWalletConnectTransportError(data);

    expect(Sentry.captureException).toHaveBeenCalledWith(
      new Error('Transport error: ' + JSON.stringify(data))
    );
    expect(broadcast).toHaveBeenCalledWith({
      method: EVENTS.WALLETCONNECT.TRANSPORT_ERROR,
      params: data,
    });
    expect(getWalletConnectTransportErrorCode()).toBeUndefined();
  });
});
