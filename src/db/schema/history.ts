import {
  TokenItem,
  TxHistoryItem,
  TxHistoryResult,
} from '@rabby-wallet/rabby-api/dist/types';
import { EntityTable } from 'dexie';

export interface TxHistoryItemRow
  extends Omit<TxHistoryItem, 'sends' | 'receives'> {
  owner_addr: string;
  sends: TokenItem[];
  receives: TokenItem[];
  project_item?: TxHistoryResult['project_dict'][string];
  approve_token?: TokenItem;
  cate_item?: TxHistoryResult['cate_dict'][string];

  _id: string;
  _updated_at: number;
}

export type HistoryTable = {
  history: EntityTable<
    TxHistoryItemRow,
    '_id' // primary key "_id" (for the typings only)
  >;
};

export const historySchema = `
  &_id,
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
  project_item,
  _updated_at,
  [owner_addr+time_at]
  `;
