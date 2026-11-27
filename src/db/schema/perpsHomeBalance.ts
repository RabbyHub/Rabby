import type { EntityTable } from 'dexie';
import { KEYRING_TYPE } from '@/constant';
import type { Account } from '@/background/service/preference';

export type PerpsHomeAccount = Pick<Account, 'address' | 'type'>;

export function canCachePerpsHomeBalance(account?: PerpsHomeAccount | null) {
  return !!(
    account?.address &&
    account.type &&
    account.type !== KEYRING_TYPE.WatchAddressKeyring &&
    account.type !== KEYRING_TYPE.GnosisKeyring
  );
}

export type PerpsHomeAmount = {
  kind: 'availableBalance' | 'pnl';
  value: number;
};

export type PerpsHomeBalanceRow = PerpsHomeAmount & {
  address: string;
  updatedAt: number;
};

export type PerpsHomeBalanceTable = {
  perpsHomeBalance: EntityTable<PerpsHomeBalanceRow, 'address'>;
};
