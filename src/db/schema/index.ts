import { HistoryTable, historySchema } from './history';
import { syncSchema, SyncTable } from './sync';

export const schema = {
  history: historySchema,
  sync: syncSchema,
};

export type DexieEntityTable = HistoryTable & SyncTable;
