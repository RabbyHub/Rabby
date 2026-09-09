import browser from 'webextension-polyfill';

const MESSAGE_TIMEOUT = 2000;
const RETRY_INTERVAL = 500;
const UNRESPONSIVE_TIMEOUT = 15000;
const RECOVERY_COOLDOWN = 30 * 60 * 1000;
const RECOVERY_KEY = 'rabby:sw-recovery';
const RECOVERY_LOCK = 'rabby:sw-recovery';

type RecoveryRecord = { attemptedAt: number; pending: boolean };
type StartupResult = 'ready' | 'unresponsive' | 'cancelled';
type RecoveryResult = 'reloading' | 'responsive' | 'blocked' | 'cancelled';

// Messages can remain pending when Chrome cannot start the worker. Bound every
// request, and stop both the timer and subsequent work when the popup closes.
function withTimeout<T>(
  operation: () => Promise<T>,
  signal: AbortSignal,
  timeout = MESSAGE_TIMEOUT
): Promise<T | undefined> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve(undefined);
      return;
    }
    const finish = (result?: T) => {
      clearTimeout(timer);
      signal.removeEventListener('abort', cancel);
      resolve(result);
    };
    const cancel = () => finish();
    const timer = setTimeout(cancel, timeout);
    signal.addEventListener('abort', cancel, { once: true });
    Promise.resolve()
      .then(() => (signal.aborted ? undefined : operation()))
      .then(finish, cancel);
  });
}

function pause(ms: number, signal: AbortSignal) {
  return withTimeout(() => new Promise<never>(() => undefined), signal, ms);
}

async function getBackgroundStatus(signal: AbortSignal, checkHealth: boolean) {
  const requestId = crypto.randomUUID();
  const [ready, health] = await Promise.all([
    withTimeout(
      () => browser.runtime.sendMessage({ type: 'getBackgroundReady' }),
      signal
    ),
    checkHealth
      ? withTimeout(
          () =>
            browser.runtime.sendMessage({
              type: 'RABBY_SW_HEALTH_CHECK',
              requestId,
            }),
          signal
        )
      : undefined,
  ]);
  return {
    ready: ready?.data?.ready === true,
    alive:
      health?.type === 'RABBY_SW_HEALTH_RESPONSE' &&
      health.requestId === requestId,
  };
}

export async function waitForBackgroundReady({
  signal,
  checkHealth,
}: {
  signal: AbortSignal;
  checkHealth: boolean;
}): Promise<StartupResult> {
  let lastResponsiveAt = performance.now();
  let failures = 0;
  while (!signal.aborted) {
    const status = await getBackgroundStatus(signal, checkHealth);
    if (signal.aborted) return 'cancelled';
    if (status.ready) return 'ready';
    if (status.alive) {
      lastResponsiveAt = performance.now();
      failures = 0;
    } else {
      failures += 1;
    }
    // A responding worker may still be restoring wallet state. Never restart
    // it merely because the business-ready handshake hasn't completed yet.
    if (
      checkHealth &&
      failures >= 3 &&
      performance.now() - lastResponsiveAt >= UNRESPONSIVE_TIMEOUT
    ) {
      return 'unresponsive';
    }
    await pause(RETRY_INTERVAL, signal);
  }
  return 'cancelled';
}

function readRecoveryRecord(): RecoveryRecord | null {
  const raw = localStorage.getItem(RECOVERY_KEY);
  if (raw === null) return null;
  const record = JSON.parse(raw);
  if (
    typeof record?.attemptedAt !== 'number' ||
    !Number.isFinite(record.attemptedAt) ||
    record.attemptedAt < 0 ||
    typeof record.pending !== 'boolean'
  ) {
    throw new Error('Invalid background recovery record');
  }
  return record;
}

export async function tryReloadForBackgroundRecovery({
  signal,
  onReloading,
}: {
  signal: AbortSignal;
  onReloading: () => void;
}): Promise<RecoveryResult> {
  try {
    // localStorage survives extension reloads; the lock prevents two popup
    // contexts from both reading an unused recovery budget before writing it.
    if (!navigator.locks) return 'blocked';
    return await navigator.locks.request(
      RECOVERY_LOCK,
      { ifAvailable: true },
      async (lock): Promise<RecoveryResult> => {
        if (signal.aborted) return 'cancelled';
        if (!lock) return 'blocked';
        const record = readRecoveryRecord();
        if (
          record?.pending ||
          (record && Date.now() - record.attemptedAt < RECOVERY_COOLDOWN)
        ) {
          return 'blocked';
        }

        onReloading();
        await pause(500, signal);
        if (signal.aborted) return 'cancelled';
        // The worker may have recovered while the fallback was being shown.
        const status = await getBackgroundStatus(signal, true);
        if (signal.aborted) return 'cancelled';
        if (status.ready || status.alive) return 'responsive';

        // Write synchronously BEFORE reload. Storage failures disable automatic
        // recovery, and an unsuccessful reload stays blocked across popup opens.
        localStorage.setItem(
          RECOVERY_KEY,
          JSON.stringify({ attemptedAt: Date.now(), pending: true })
        );
        browser.runtime.reload();
        return 'reloading';
      }
    );
  } catch (error) {
    console.warn('[background startup] automatic recovery unavailable', error);
    return 'blocked';
  }
}

export async function markBackgroundStartupSuccessful(startedAt: number) {
  try {
    await navigator.locks?.request(
      RECOVERY_LOCK,
      { ifAvailable: true },
      (lock) => {
        if (!lock) return;
        const record = readRecoveryRecord();
        // An older popup finishing initialization must not reset an attempt
        // another popup has just claimed.
        if (record?.pending && record.attemptedAt <= startedAt) {
          localStorage.setItem(
            RECOVERY_KEY,
            JSON.stringify({ ...record, pending: false })
          );
        }
      }
    );
  } catch (error) {
    console.warn('[background startup] failed to reset recovery record', error);
  }
}
