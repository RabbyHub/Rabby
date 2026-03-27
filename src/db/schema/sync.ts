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
  pendingStartTime?: number;
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
