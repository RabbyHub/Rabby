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
let dbOpenIssueReported = false;

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
db.on('blocked', (event) => {
  dbOpenBlocked = true;
  Sentry.captureMessage('indexeddb open blocked', {
    level: 'warning',
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
