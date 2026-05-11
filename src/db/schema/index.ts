import { BalanceTable, balanceSchema } from './balance';
import { AppChainTable, appChainSchema } from './appChain';
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

export const schemaV3 = {
  ...schemaV2,
  defi: defiSchema,
};

export const schemaV4 = {
  ...schemaV3,
  appChain: appChainSchema,
};

export const schema = {
  ...schemaV4,
  balance: balanceSchema,
};

export type DexieEntityTable = HistoryTable &
  SyncTable &
  TokenTable &
  DefiTable &
  AppChainTable &
  BalanceTable;
