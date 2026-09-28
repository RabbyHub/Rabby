import {
  TokenItem,
  TxHistoryItem,
  TxHistoryResult,
} from '@rabby-wallet/rabby-api/dist/types';
import { EntityTable } from 'dexie';

export interface SyncItemRow {
  address: string;
  type: 'history' | string;
  updatedAt: number;
  _id: string;
  isSyncing?: boolean;
  // Which history API wrote the pending cursor; rows written before this
  // field existed only came from the all-history API.
  pendingApi?: 'all' | 'realtime';
  pendingStartTime?: number;
  // Seconds for the all-history API, milliseconds for the realtime API,
  // matching each API's own latestTime parameter.
  pendingLatestTime?: number;
}

export type SyncTable = {
  sync: EntityTable<
    SyncItemRow,
    '_id' // primary key "_id" (for the typings only)
  >;
};

export const syncSchema = `
  &_id,
  address,
  [address+type],
  updatedAt
  `;
