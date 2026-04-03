import { AppChainItem } from '@rabby-wallet/rabby-api/dist/types';
import { EntityTable } from 'dexie';

export interface AppChainItemRow extends AppChainItem {
  owner_addr: string;
  _id: string;
  _updated_at: number;
}

export type AppChainTable = {
  appChain: EntityTable<
    AppChainItemRow,
    '_id' // primary key "_id" (for the typings only)
  >;
};

export const appChainSchema = `
  &_id,
  owner_addr,
  id
  `;
