import { TxHistoryItem } from '@rabby-wallet/rabby-api/dist/types';
import { EntityTable } from 'dexie';

export interface TxHistoryItemRow extends TxHistoryItem {
  _id: string;
}

export type HistoryEntityTable = {
  history: EntityTable<
    TxHistoryItemRow,
    '_id' // primary key "_id" (for the typings only)
  >;
};

export const historyEntitySchema = {
  history: `
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
  tx
  `,
};
