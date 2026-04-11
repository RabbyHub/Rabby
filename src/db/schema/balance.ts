import { TotalBalanceResponse } from '@rabby-wallet/rabby-api/dist/types';
import { EntityTable } from 'dexie';

export interface BalanceCacheData extends TotalBalanceResponse {
  evmUsdValue: number;
  appChainIds: string[];
  appChainUsdValue: number;
}

export type BalanceCacheInput = TotalBalanceResponse & {
  evmUsdValue?: number;
  appChainIds?: string[];
  appChainUsdValue?: number;
};

export const normalizeBalanceCacheData = (
  balance: BalanceCacheInput
): BalanceCacheData => {
  const evmUsdValue = balance.evmUsdValue || 0;

  return {
    ...balance,
    evmUsdValue,
    appChainIds: balance.appChainIds || [],
    appChainUsdValue:
      balance.appChainUsdValue ?? balance.total_usd_value - evmUsdValue,
  };
};

export interface BalanceRow extends BalanceCacheData {
  address: string;
  _id: string;
  _updated_at: number;
}

export type BalanceTable = {
  balance: EntityTable<
    BalanceRow,
    '_id' // primary key "_id" (for the typings only)
  >;
};

export const balanceSchema = `
  &_id,
  address
  `;
