import { CollectionList } from '@rabby-wallet/rabby-api/dist/types';
import { EntityTable } from 'dexie';

export interface NFTCollectionRow extends CollectionList {
  owner_addr: string;
  _id: string;
  _updated_at: number;
}

export type NFTTable = {
  nft: EntityTable<
    NFTCollectionRow,
    '_id' // primary key "_id" (for the typings only)
  >;
};

export const nftSchema = `
  &_id,
  owner_addr,
  chain,
  [owner_addr+chain]
  `;
