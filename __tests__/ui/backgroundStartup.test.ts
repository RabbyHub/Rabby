import browser from 'webextension-polyfill';
import { jest as jestTimers } from '@jest/globals';
import {
  markBackgroundStartupSuccessful,
  tryReloadForBackgroundRecovery,
  waitForBackgroundReady,
} from '@/ui/utils/backgroundStartup';

jestTimers.mock('webextension-polyfill', () => ({
  __esModule: true,
  default: { runtime: { sendMessage: jest.fn(), reload: jest.fn() } },
}));

const sendMessage = browser.runtime.sendMessage as jest.Mock;
const reload = browser.runtime.reload as jest.Mock;
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
});

test('concurrent popup contexts can only claim one recovery attempt', async () => {
  const first = recover();
  const second = recover();
  await expect(second).resolves.toBe('blocked');
  await jestTimers.advanceTimersByTimeAsync(500);
  await expect(first).resolves.toBe('reloading');
  expect(reload).toHaveBeenCalledTimes(1);
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
