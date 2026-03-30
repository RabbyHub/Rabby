import { DefiTable, defiSchema } from './defi';
import { HistoryTable, historySchema } from './history';
import { syncSchema, SyncTable } from './sync';
import { tokenSchema, TokenTable } from './token';

export const schemaV1 = {
  history: historySchema,
  sync: syncSchema,
};

export const schemaV2 = {
  ...schemaV1,
  token: tokenSchema,
};

export const schema = {
  ...schemaV2,
  defi: defiSchema,
};

export type DexieEntityTable = HistoryTable &
  SyncTable &
  TokenTable &
  DefiTable;
