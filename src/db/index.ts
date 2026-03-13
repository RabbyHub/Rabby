import { TxHistoryItem } from '@rabby-wallet/rabby-api/dist/types';
import { Dexie } from 'dexie';
import { historyEntitySchema, HistoryEntityTable } from './entities/history';

export interface TxHistoryItemRow extends TxHistoryItem {
  _id: string;
}

export const db = new Dexie('rabby-database') as Dexie & HistoryEntityTable;

db.version(1).stores({ ...historyEntitySchema });
