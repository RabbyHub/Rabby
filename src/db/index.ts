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

let dbOpenBlocked = false;
let dbOpenBlockedReported = false;
let dbOpenIssueReported = false;

// Guards the outcome of the single db.open() below, so timeout and slow stay
// mutually exclusive. The promise settles once, so each path is one-shot.
const reportDbOpenIssue = (
  message: string,
  level: 'warning' | 'error',
  extra: Record<string, unknown>
) => {
  if (dbOpenIssueReported) {
    return;
  }
  dbOpenIssueReported = true;
  Sentry.captureMessage(message, {
    level,
    tags: { db_blocked: dbOpenBlocked },
    extra,
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
  Sentry.captureMessage('indexeddb open blocked', {
    level: 'warning',
    tags: { db_blocked: true },
    extra: {
      oldVersion: event?.oldVersion,
      newVersion: event?.newVersion,
    },
  });
});

const dbOpenStartedAt = Date.now();
const dbOpenTimeoutTimer = setTimeout(() => {
  reportDbOpenIssue('indexeddb open timeout', 'error', {
    timeout: DB_OPEN_TIMEOUT,
    blocked: dbOpenBlocked,
  });
}, DB_OPEN_TIMEOUT);

db.open()
  .then(() => {
    const elapsed = Date.now() - dbOpenStartedAt;
    if (elapsed >= DB_OPEN_SLOW) {
      reportDbOpenIssue('indexeddb open slow', 'warning', {
        elapsed,
        blocked: dbOpenBlocked,
      });
    }
  })
  .catch((error) => {
    // Dexie rejects every later query too, so this surfaces in the UI as
    // well; capturing here is what attaches the cause and the elapsed time.
    Sentry.captureException(error, {
      tags: { db_blocked: dbOpenBlocked },
      extra: { elapsed: Date.now() - dbOpenStartedAt },
    });
  })
  .finally(() => {
    clearTimeout(dbOpenTimeoutTimer);
  });
