import * as Sentry from '@sentry/browser';
import { Dexie } from 'dexie';
import {
  DexieEntityTable,
  schema,
  schemaV1,
  schemaV2,
  schemaV3,
  schemaV4,
  schemaV5,
} from './schema';
import { TxHistoryItemRow } from './schema/history';
import { judgeIsSmallUsdTx } from '@/utils/history';

export const db = new Dexie('rabby-database') as Dexie & DexieEntityTable;

db.version(1).stores(schemaV1);
db.version(2).stores(schemaV2);
db.version(3).stores(schemaV3);
db.version(4).stores(schemaV4);
db.version(5).stores(schemaV5);
db.version(6).upgrade((trans) => {
  trans
    .table('history')
    .toCollection()
    .modify((item: TxHistoryItemRow) => {
      try {
        item.is_small_tx = judgeIsSmallUsdTx(item);
      } catch (e) {
        console.error('judgeIsSmallUsdTx error', e, item);
      }
    });
});
db.version(7).stores(schema);
// re-judge is_small_tx after including sends in judgeIsSmallUsdTx
db.version(8).upgrade((trans) => {
  trans
    .table('history')
    .toCollection()
    .modify((item: TxHistoryItemRow) => {
      try {
        item.is_small_tx = judgeIsSmallUsdTx(item);
      } catch (e) {
        console.error('judgeIsSmallUsdTx error', e, item);
      }
    });
});

// An open that never settles is invisible: dexie-react-hooks only throws once
// the query emits an error, so a blocked or stalled open leaves every view
// that reads the db sitting in its loading state with nothing reported.
const DB_OPEN_TIMEOUT = 15_000;
// Opening is a local operation; anything this slow already looks broken to
// the user, and the duration is what tells a slow disk from a stuck upgrade.
const DB_OPEN_SLOW = 5_000;
// Slow opens are common enough (every service worker start on weak machines)
// that reporting each one floods the project; the timing tags only need a
// representative sample. Timeouts and their late follow-ups stay unsampled so
// the two counts can still be subtracted to size real hangs. Multiply slow
// counts by 1 / sampleRate to recover totals.
const DB_OPEN_SLOW_SAMPLE_RATE = 0.05;

// Android Chromium builds that run extensions (the reduced `Android 10; K` UA)
// sit on weak hardware and freeze the background, so their open timings
// measure the device rather than the extension and drown out the desktop
// signal. Only the timing messages are muted there; an open that actually
// fails is still captured as an exception below.
const isAndroid = /android/i.test(globalThis.navigator?.userAgent ?? '');

const captureDbOpenMessage = (
  message: string,
  context: Parameters<typeof Sentry.captureMessage>[1]
) => {
  if (isAndroid) {
    return;
  }
  Sentry.captureMessage(message, context);
};

let dbOpenBlocked = false;
let dbOpenBlockedReported = false;
let dbOpenIssueReported = false;
let dbOpenTimedOut = false;

const dbOpenStartedAt = Date.now();

// The open is issued while the importing bundle is still evaluating, and its
// callbacks can't run until that bundle and whatever it kicks off yield, so
// elapsed alone can't tell a slow IndexedDB from a busy event loop. The first
// macrotask after this point marks when the loop first came free.
let dbOpenFirstTickAt: number | null = null;
setTimeout(() => {
  dbOpenFirstTickAt = Date.now();
}, 0);

// The background (sw.js in MV3, background.html in MV2) opens on every
// service worker start; UI pages open once per page load.
const getDbOpenContext = () => {
  const pathname = globalThis.location?.pathname ?? '';
  if (pathname === '/sw.js' || pathname === '/background.html') {
    return 'background';
  }
  return pathname.match(/^\/([\w-]+)\.html$/)?.[1] ?? 'unknown';
};

const durationBucket = (durationMs: number) => {
  if (durationMs < 1_000) return 'lt_1s';
  if (durationMs < 5_000) return '1s_5s';
  if (durationMs < 10_000) return '5s_10s';
  if (durationMs < 15_000) return '10s_15s';
  if (durationMs < 30_000) return '15s_30s';
  if (durationMs < 60_000) return '30s_60s';
  return 'gte_60s';
};

// Durations go into tags as buckets because Discover can aggregate tags but
// not extra fields; the exact values stay in extra.
const getDbOpenTiming = () => {
  const elapsed = Date.now() - dbOpenStartedAt;
  // Still null means the open settled before the first tick ran: the loop was
  // busy for the whole wait, so all of it counts as loop lag and the share
  // spent in IndexedDB can't be told apart.
  const loopLag =
    dbOpenFirstTickAt === null ? elapsed : dbOpenFirstTickAt - dbOpenStartedAt;
  // Time after the loop first came free. Mostly IndexedDB, but later
  // bootstrap work that blocks the loop again still lands here.
  const afterFirstTick = dbOpenFirstTickAt === null ? null : elapsed - loopLag;
  return {
    tags: {
      db_blocked: dbOpenBlocked,
      db_open_context: getDbOpenContext(),
      db_open_elapsed: durationBucket(elapsed),
      db_open_loop_lag: durationBucket(loopLag),
      db_open_after_first_tick:
        afterFirstTick === null ? 'unknown' : durationBucket(afterFirstTick),
    },
    extra: {
      elapsed,
      loopLag,
      afterFirstTick,
      blocked: dbOpenBlocked,
    },
  };
};

// Guards the outcome of the single db.open() below, so timeout and slow stay
// mutually exclusive. The promise settles once, so each path is one-shot.
const reportDbOpenIssue = (
  message: string,
  level: 'warning' | 'error',
  extra: Record<string, unknown> = {}
) => {
  if (dbOpenIssueReported) {
    return;
  }
  dbOpenIssueReported = true;
  const timing = getDbOpenTiming();
  captureDbOpenMessage(message, {
    level,
    tags: timing.tags,
    extra: { ...timing.extra, ...extra },
  });
};

// Fires when another context still holds an older version open. Dexie's own
// handler only warns to the console, and the upgrade waits here indefinitely.
//
// Deliberately separate from reportDbOpenIssue: this is the cause, and
// the timeout is the outcome. A block that clears and one that never does are
// different failures, so sharing a guard would let the cause suppress the
// outcome — the signal this instrumentation exists to capture. It needs its
// own guard because Dexie registers req.onblocked on every open attempt and
// its default versionchange handler closes with auto-open still enabled, so
// unlike the one-shot paths below this one can fire repeatedly.
db.on('blocked', (event) => {
  dbOpenBlocked = true;
  if (dbOpenBlockedReported) {
    return;
  }
  dbOpenBlockedReported = true;
  captureDbOpenMessage('indexeddb open blocked', {
    level: 'warning',
    tags: { db_blocked: true, db_open_context: getDbOpenContext() },
    extra: {
      oldVersion: event?.oldVersion,
      newVersion: event?.newVersion,
    },
  });
});

const dbOpenTimeoutTimer = setTimeout(() => {
  dbOpenTimedOut = true;
  reportDbOpenIssue('indexeddb open timeout', 'error', {
    timeout: DB_OPEN_TIMEOUT,
  });
}, DB_OPEN_TIMEOUT);

db.open()
  .then(() => {
    // The timeout is reported as soon as it fires, since the context may be
    // gone before the open settles. Following it up here is what separates a
    // slow open from a hung one: timeouts without a matching late report
    // never opened (or their context was torn down first).
    if (dbOpenTimedOut) {
      const timing = getDbOpenTiming();
      captureDbOpenMessage('indexeddb open resolved after timeout', {
        level: 'warning',
        tags: timing.tags,
        extra: timing.extra,
      });
      return;
    }
    if (
      Date.now() - dbOpenStartedAt >= DB_OPEN_SLOW &&
      Math.random() < DB_OPEN_SLOW_SAMPLE_RATE
    ) {
      reportDbOpenIssue('indexeddb open slow', 'warning', {
        sampleRate: DB_OPEN_SLOW_SAMPLE_RATE,
      });
    }
  })
  .catch((error) => {
    // Dexie rejects every later query too, so this surfaces in the UI as
    // well; capturing here is what attaches the cause and the elapsed time.
    const timing = getDbOpenTiming();
    Sentry.captureException(error, {
      tags: { ...timing.tags, db_open_timed_out: dbOpenTimedOut },
      extra: timing.extra,
    });
  })
  .finally(() => {
    clearTimeout(dbOpenTimeoutTimer);
  });
