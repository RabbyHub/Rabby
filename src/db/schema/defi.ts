import { ComplexProtocol } from '@rabby-wallet/rabby-api/dist/types';
import { EntityTable } from 'dexie';

export interface DefiProtocolRow extends ComplexProtocol {
  owner_addr: string;
  _id: string;
  _updated_at: number;
}

export type DefiTable = {
  defi: EntityTable<
    DefiProtocolRow,
    '_id' // primary key "_id" (for the typings only)
  >;
};

export const defiSchema = `
  &_id,
  owner_addr,
  chain,
  [owner_addr+chain]
  `;
