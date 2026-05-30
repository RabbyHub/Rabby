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
