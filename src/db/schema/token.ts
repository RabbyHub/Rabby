import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import { EntityTable } from 'dexie';

export interface TokenItemRow extends TokenItem {
  owner_addr: string;
  _id: string;
  _updated_at: number;
}

export type TokenTable = {
  token: EntityTable<
    TokenItemRow,
    '_id' // primary key "_id" (for the typings only)
  >;
};

export const tokenSchema = `
  &_id,
  owner_addr,
  chain,
  [owner_addr+chain]
  `;
