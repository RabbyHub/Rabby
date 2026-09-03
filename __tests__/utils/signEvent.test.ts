import eventBus from '@/eventBus';
import { EVENTS } from '@/constant';
import {
  cancelSignComponentWaiting,
  notifySigningUiReady,
  getSignEventErrorMessage,
  waitForSigningUi,
} from '@/utils/signEvent';
import { toSigningAttemptRef } from '@/utils/signingTypes';

describe('scoped signing readiness events', () => {
  beforeEach(() => {
    eventBus.removeAllEventListeners(EVENTS.SIGN_WAITING_AMOUNTED);
    eventBus.removeAllEventListeners(EVENTS.SIGN_WAITING_CANCELLED);
    eventBus.removeAllEventListeners(EVENTS.broadcastToBackground);
  });

  afterEach(() => {
    eventBus.removeAllEventListeners(EVENTS.SIGN_WAITING_AMOUNTED);
    eventBus.removeAllEventListeners(EVENTS.SIGN_WAITING_CANCELLED);
    eventBus.removeAllEventListeners(EVENTS.broadcastToBackground);
  });

  it('waits for the matching attempt instead of consuming another flow event', async () => {
    let settled = false;
    const attempt = toSigningAttemptRef('flow-a', 'attempt-a');
    const waiting = waitForSigningUi(attempt).then(() => {
      settled = true;
    });

    eventBus.emit(EVENTS.SIGN_WAITING_AMOUNTED, {
      flowId: 'flow-b',
      attemptId: 'attempt-b',
    });
    await Promise.resolve();
    expect(settled).toBe(false);

    eventBus.emit(EVENTS.SIGN_WAITING_AMOUNTED, {
      flowId: 'flow-a',
      attemptId: 'attempt-a',
    });
    await waiting;
    expect(settled).toBe(true);
  });

  it('requires an identity-bearing ready event', async () => {
    let settled = false;
    const waiting = waitForSigningUi(
      toSigningAttemptRef('flow-a', 'attempt-a')
    ).then(() => {
      settled = true;
    });

    eventBus.emit(EVENTS.SIGN_WAITING_AMOUNTED, {
      flowId: 'flow-b',
      attemptId: 'attempt-b',
    });
    await Promise.resolve();
    expect(settled).toBe(false);

    eventBus.emit(EVENTS.SIGN_WAITING_AMOUNTED, {
      flowId: 'flow-a',
      attemptId: 'attempt-a',
    });
    await waiting;
    expect(settled).toBe(true);
  });

  it('broadcasts the signing attempt to the background and local listeners', () => {
    const background = jest.fn();
    const ui = jest.fn();
    eventBus.addEventListener(EVENTS.broadcastToBackground, background);
    eventBus.addEventListener(EVENTS.SIGN_WAITING_AMOUNTED, ui);

    const attempt = toSigningAttemptRef('flow-a', 'attempt-a');
    notifySigningUiReady(toSigningAttemptRef('flow-a', 'attempt-a'));

    expect(background).toHaveBeenCalledWith({
      method: EVENTS.SIGN_WAITING_AMOUNTED,
      data: attempt,
    });
    expect(ui).toHaveBeenCalledWith(attempt);
  });

  it('keeps legacy error consumers compatible with identity-bearing payloads', () => {
    expect(
      getSignEventErrorMessage({
        errorMsg: 'No OneKey Device found',
        flowId: 'flow-a',
        attemptId: 'attempt-a',
      })
    ).toBe('No OneKey Device found');
    expect(getSignEventErrorMessage('DISCONNECTED')).toBe('DISCONNECTED');
  });

  it('rejects a waiter when its matching attempt is cancelled', async () => {
    const attempt = toSigningAttemptRef('flow-a', 'attempt-a');
    const waiting = waitForSigningUi(attempt);

    cancelSignComponentWaiting(toSigningAttemptRef('flow-b', 'attempt-b'));
    await Promise.resolve();

    let settled = false;
    waiting.catch(() => {
      settled = true;
    });
    await Promise.resolve();
    expect(settled).toBe(false);

    cancelSignComponentWaiting(attempt);
    await expect(waiting).rejects.toMatchObject({ code: 4001 });
  });
});
