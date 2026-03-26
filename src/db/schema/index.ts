import { HistoryTable, historySchema } from './history';
import { syncSchema, SyncTable } from './sync';
import { tokenSchema, TokenTable } from './token';

export const schemaV1 = {
  history: historySchema,
  sync: syncSchema,
};

export const schema = {
  ...schemaV1,
  token: tokenSchema,
};

export type DexieEntityTable = HistoryTable & SyncTable & TokenTable;
