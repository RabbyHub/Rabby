import { HistoryTable, historySchema } from './history';

export const schema = {
  history: historySchema,
};

export type DexieEntityTable = HistoryTable;
