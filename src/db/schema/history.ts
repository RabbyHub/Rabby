import { TxHistoryItem } from '@rabby-wallet/rabby-api/dist/types';
import { EntityTable } from 'dexie';

export interface TxHistoryItemRow extends TxHistoryItem {
  _id: string;
  owner_addr: string;
  projectDict: Record<string, any>;
  cateDict: Record<string, any>;
  tokenDict: Record<string, any>;
  tokenUUIDDict: Record<string, any>;
}

export type HistoryTable = {
  history: EntityTable<
    TxHistoryItemRow,
    '_id' // primary key "_id" (for the typings only)
  >;
};

export const historySchema = `
  _id,
  owner_addr,
  cate_id,
  chain,
  debt_liquidated,
  id,
  is_scam,
  other_addr,
  project_id,
  receives,
  sends,
  time_at,
  token_approve,
  tx,
  projectDict,
  cateDict,
  tokenDict,
  tokenUUIDDict
  `;
