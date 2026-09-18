import browser from 'webextension-polyfill';
import * as Sentry from '@sentry/react';
import { jest as jestTimers } from '@jest/globals';
import { shouldIgnoreSentryError } from '@/utils/sentry';
import {
  markBackgroundStartupSuccessful,
  reloadForBackgroundRecovery,
  tryReloadForBackgroundRecovery,
  waitForBackgroundReady,
} from '@/ui/utils/backgroundStartup';

jestTimers.mock('webextension-polyfill', () => ({
  __esModule: true,
  default: { runtime: { sendMessage: jest.fn(), reload: jest.fn() } },
}));
jestTimers.mock('@sentry/react', () => ({
  captureMessage: jest.fn(),
  flush: jest.fn(),
}));

const sendMessage = browser.runtime.sendMessage as jest.Mock;
const reload = browser.runtime.reload as jest.Mock;
const captureMessage = Sentry.captureMessage as jest.Mock;
const flush = Sentry.flush as jest.Mock;
const key = 'rabby:sw-recovery';
let lockHeld = false;

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-09-09T00:00:00Z'));
  jest.clearAllMocks();
  localStorage.clear();
  lockHeld = false;
  Object.defineProperty(crypto, 'randomUUID', {
    configurable: true,
    value: () => 'test-request-id',
  });
  Object.defineProperty(navigator, 'locks', {
    configurable: true,
    value: {
      request: jest.fn(async (_name, _options, callback) => {
        if (lockHeld) return callback(null);
        lockHeld = true;
        try {
          return await callback({});
        } finally {
          lockHeld = false;
        }
      }),
    },
  });
  sendMessage.mockReset().mockResolvedValue(undefined);
  reload.mockReset();
  captureMessage.mockReset();
  flush.mockReset().mockResolvedValue(true);
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

const waitForReady = (controller = new AbortController(), checkHealth = true) =>
  waitForBackgroundReady({ signal: controller.signal, checkHealth });

const recover = (controller = new AbortController()) =>
  tryReloadForBackgroundRecovery({
    signal: controller.signal,
    onReloading: jest.fn(),
  });

test('accepts only the explicit business-ready response', async () => {
  sendMessage.mockResolvedValue({ data: { ready: false } });
  const result = waitForReady();
  await jestTimers.advanceTimersByTimeAsync(1000);
  sendMessage.mockImplementation(async ({ type }) =>
    type === 'getBackgroundReady' ? { data: { ready: true } } : undefined
  );
  await jestTimers.advanceTimersByTimeAsync(500);
  await expect(result).resolves.toBe('ready');
  expect(jest.getTimerCount()).toBe(0);
  expect(reload).not.toHaveBeenCalled();
});

test('a responsive worker can initialize slowly without automatic recovery', async () => {
  sendMessage.mockImplementation(async ({ type, requestId }) =>
    type === 'RABBY_SW_HEALTH_CHECK'
      ? { type: 'RABBY_SW_HEALTH_RESPONSE', requestId }
      : undefined
  );
  const controller = new AbortController();
  const finished = jest.fn();
  const result = waitForReady(controller).then(finished);
  await jestTimers.advanceTimersByTimeAsync(60000);
  expect(finished).not.toHaveBeenCalled();
  expect(reload).not.toHaveBeenCalled();
  controller.abort();
  await result;
  expect(finished).toHaveBeenCalledWith('cancelled');
  expect(jest.getTimerCount()).toBe(0);
});

test.each(['undefined', 'reject', 'pending', 'wrong-pong'])(
  'detects sustained communication failure (%s)',
  async (failure) => {
    if (failure === 'reject') {
      sendMessage.mockRejectedValue(new Error('Receiving end does not exist'));
    } else if (failure === 'pending') {
      sendMessage.mockImplementation(() => new Promise(() => undefined));
    } else if (failure === 'wrong-pong') {
      sendMessage.mockResolvedValue({
        type: 'RABBY_SW_HEALTH_RESPONSE',
        requestId: 'another-request',
      });
    }
    const finished = jest.fn();
    const result = waitForReady().then(finished);
    await jestTimers.advanceTimersByTimeAsync(14999);
    expect(finished).not.toHaveBeenCalled();
    await jestTimers.advanceTimersByTimeAsync(3001);
    await result;
    expect(finished).toHaveBeenCalledWith('unresponsive');
    expect(sendMessage.mock.calls.length).toBeGreaterThanOrEqual(6);
    expect(jest.getTimerCount()).toBe(0);
  }
);

test('notification and tab startup never enter automatic recovery', async () => {
  const controller = new AbortController();
  const finished = jest.fn();
  const result = waitForReady(controller, false).then(finished);
  await jestTimers.advanceTimersByTimeAsync(60000);
  expect(finished).not.toHaveBeenCalled();
  expect(
    sendMessage.mock.calls.every(
      ([message]) => message.type === 'getBackgroundReady'
    )
  ).toBe(true);
  controller.abort();
  await result;
  expect(finished).toHaveBeenCalledWith('cancelled');
});

test('persists the recovery attempt before reload and blocks subsequent popup opens', async () => {
  reload.mockImplementation(() => {
    expect(JSON.parse(localStorage.getItem(key)!)).toEqual({
      attemptedAt: Date.now(),
      pending: true,
    });
  });
  const result = recover();
  await jestTimers.advanceTimersByTimeAsync(500);
  await expect(result).resolves.toBe('reloading');
  await jestTimers.advanceTimersByTimeAsync(60 * 60 * 1000);
  await expect(recover()).resolves.toBe('blocked');
  expect(reload).toHaveBeenCalledTimes(1);
  expect(captureMessage).toHaveBeenCalledTimes(1);
  expect(captureMessage).toHaveBeenCalledWith('Background recovery reload', {
    level: 'warning',
    tags: { reload_trigger: 'automatic' },
  });
  expect(shouldIgnoreSentryError(captureMessage.mock.calls[0][0])).toBe(false);
});

test('manual reload reports its trigger and waits for Sentry before reloading', async () => {
  let finishFlush!: (sent: boolean) => void;
  flush.mockImplementation(
    () => new Promise<boolean>((resolve) => (finishFlush = resolve))
  );
  const result = reloadForBackgroundRecovery({
    trigger: 'manual',
    signal: new AbortController().signal,
  });
  await jestTimers.advanceTimersByTimeAsync(0);
  expect(captureMessage).toHaveBeenCalledWith('Background recovery reload', {
    level: 'warning',
    tags: { reload_trigger: 'manual' },
  });
  expect(flush).toHaveBeenCalledWith(2000);
  expect(captureMessage.mock.invocationCallOrder[0]).toBeLessThan(
    flush.mock.invocationCallOrder[0]
  );
  expect(reload).not.toHaveBeenCalled();
  finishFlush(true);
  await expect(result).resolves.toBe('reloading');
  expect(reload).toHaveBeenCalledTimes(1);
  expect(jest.getTimerCount()).toBe(0);
});

test.each(['capture-throws', 'flush-rejects', 'flush-times-out', 'not-sent'])(
  'telemetry failure (%s) cannot prevent automatic recovery',
  async (failure) => {
    if (failure === 'capture-throws') {
      captureMessage.mockImplementation(() => {
        throw new Error('Sentry unavailable');
      });
    } else if (failure === 'flush-rejects') {
      flush.mockRejectedValue(new Error('Transport unavailable'));
    } else if (failure === 'flush-times-out') {
      flush.mockImplementation(() => new Promise(() => undefined));
    } else {
      flush.mockResolvedValue(false);
    }
    const result = recover();
    await jestTimers.advanceTimersByTimeAsync(2499);
    if (failure === 'flush-times-out') {
      expect(reload).not.toHaveBeenCalled();
      expect(localStorage.getItem(key)).toBeNull();
    }
    await jestTimers.advanceTimersByTimeAsync(1);
    await expect(result).resolves.toBe('reloading');
    expect(reload).toHaveBeenCalledTimes(1);
    expect(JSON.parse(localStorage.getItem(key)!)).toMatchObject({
      pending: true,
    });
    expect(jest.getTimerCount()).toBe(0);
  }
);

test('closing the popup during Sentry flush does not reload or consume the recovery budget', async () => {
  flush.mockImplementation(() => new Promise(() => undefined));
  const controller = new AbortController();
  const result = recover(controller);
  await jestTimers.advanceTimersByTimeAsync(500);
  expect(captureMessage).toHaveBeenCalledTimes(1);
  controller.abort();
  await expect(result).resolves.toBe('cancelled');
  expect(reload).not.toHaveBeenCalled();
  expect(localStorage.getItem(key)).toBeNull();
  expect(jest.getTimerCount()).toBe(0);
});

test('an already closed popup cannot report or reload', async () => {
  const controller = new AbortController();
  controller.abort();
  await expect(
    reloadForBackgroundRecovery({
      trigger: 'manual',
      signal: controller.signal,
    })
  ).resolves.toBe('cancelled');
  expect(captureMessage).not.toHaveBeenCalled();
  expect(flush).not.toHaveBeenCalled();
  expect(reload).not.toHaveBeenCalled();
});

test('successful startup resets the pending flag but retains the cooldown', async () => {
  const attemptedAt = Date.now();
  localStorage.setItem(key, JSON.stringify({ attemptedAt, pending: true }));
  await markBackgroundStartupSuccessful(Date.now());
  expect(JSON.parse(localStorage.getItem(key)!)).toEqual({
    attemptedAt,
    pending: false,
  });
  await expect(recover()).resolves.toBe('blocked');
  await jestTimers.advanceTimersByTimeAsync(30 * 60 * 1000);
  const result = recover();
  await jestTimers.advanceTimersByTimeAsync(500);
  await expect(result).resolves.toBe('reloading');
});

test.each(['read', 'write', 'corrupt'])(
  'storage failure (%s) prevents automatic reload',
  async (failure) => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    if (failure === 'corrupt') {
      localStorage.setItem(key, 'invalid JSON');
    } else {
      jest
        .spyOn(Storage.prototype, failure === 'read' ? 'getItem' : 'setItem')
        .mockImplementation(() => {
          throw new Error('Storage unavailable');
        });
    }
    const result = recover();
    await jestTimers.advanceTimersByTimeAsync(500);
    await expect(result).resolves.toBe('blocked');
    expect(reload).not.toHaveBeenCalled();
  }
);

test('closing the popup cancels pending probes and recovery', async () => {
  sendMessage.mockImplementation(() => new Promise(() => undefined));
  const controller = new AbortController();
  const startup = waitForReady(controller);
  await jestTimers.advanceTimersByTimeAsync(100);
  controller.abort();
  await expect(startup).resolves.toBe('cancelled');
  expect(jest.getTimerCount()).toBe(0);

  const recoveryController = new AbortController();
  const recovery = recover(recoveryController);
  await jestTimers.advanceTimersByTimeAsync(600);
  recoveryController.abort();
  await expect(recovery).resolves.toBe('cancelled');
  expect(localStorage.getItem(key)).toBeNull();
  expect(reload).not.toHaveBeenCalled();
  expect(jest.getTimerCount()).toBe(0);
});

test('rechecks responsiveness immediately before reloading', async () => {
  sendMessage.mockImplementation(async ({ type, requestId }) =>
    type === 'RABBY_SW_HEALTH_CHECK'
      ? { type: 'RABBY_SW_HEALTH_RESPONSE', requestId }
      : undefined
  );
  const result = recover();
  await jestTimers.advanceTimersByTimeAsync(500);
  await expect(result).resolves.toBe('responsive');
  expect(localStorage.getItem(key)).toBeNull();
  expect(reload).not.toHaveBeenCalled();
  expect(captureMessage).not.toHaveBeenCalled();
});

test('concurrent popup contexts can only claim one recovery attempt', async () => {
  flush.mockImplementation(() => new Promise(() => undefined));
  const first = recover();
  const second = recover();
  await expect(second).resolves.toBe('blocked');
  await jestTimers.advanceTimersByTimeAsync(500);
  await expect(recover()).resolves.toBe('blocked');
  expect(reload).not.toHaveBeenCalled();
  await jestTimers.advanceTimersByTimeAsync(2000);
  await expect(first).resolves.toBe('reloading');
  expect(reload).toHaveBeenCalledTimes(1);
  expect(captureMessage).toHaveBeenCalledTimes(1);
});

test('an older popup completing startup cannot clear a newer recovery attempt', async () => {
  const record = { attemptedAt: Date.now(), pending: true };
  localStorage.setItem(key, JSON.stringify(record));
  await markBackgroundStartupSuccessful(Date.now() - 1000);
  expect(JSON.parse(localStorage.getItem(key)!)).toEqual(record);
});

test('a successful health probe resets the consecutive failure window', async () => {
  const finished = jest.fn();
  const result = waitForReady().then(finished);
  await jestTimers.advanceTimersByTimeAsync(14000);
  sendMessage.mockImplementation(async ({ type, requestId }) =>
    type === 'RABBY_SW_HEALTH_CHECK'
      ? { type: 'RABBY_SW_HEALTH_RESPONSE', requestId }
      : undefined
  );
  await jestTimers.advanceTimersByTimeAsync(500);
  sendMessage.mockResolvedValue(undefined);
  await jestTimers.advanceTimersByTimeAsync(14000);
  expect(finished).not.toHaveBeenCalled();
  await jestTimers.advanceTimersByTimeAsync(1000);
  await result;
  expect(finished).toHaveBeenCalledWith('unresponsive');
});

test('cancelling before dispatch avoids sending any startup messages', async () => {
  const controller = new AbortController();
  const result = waitForReady(controller);
  controller.abort();
  await expect(result).resolves.toBe('cancelled');
  expect(sendMessage).not.toHaveBeenCalled();
  expect(jest.getTimerCount()).toBe(0);
});
