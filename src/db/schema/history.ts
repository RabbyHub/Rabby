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
  [owner_addr+time_at]
  `;
