import { db } from '..';
import {
  BalanceCacheData,
  BalanceCacheInput,
  BalanceRow,
  normalizeBalanceCacheData,
} from '../schema/balance';

class BalanceDbService {
  private normalizeAddress(address: string) {
    return address.toLowerCase();
  }

  async queryBalance(address: string): Promise<BalanceCacheData | null> {
    const normalizedAddress = this.normalizeAddress(address);
    const row = await db.balance
      .where('address')
      .equals(normalizedAddress)
      .first();

    if (!row) {
      return null;
    }

    return normalizeBalanceCacheData(row);
  }

  async queryBalanceMap(): Promise<Record<string, BalanceCacheData>> {
    const rows = await db.balance.toArray();

    return rows.reduce((map, row) => {
      map[row.address] = normalizeBalanceCacheData(row);
      return map;
    }, {} as Record<string, BalanceCacheData>);
  }

  async putBalance(address: string, balance: BalanceCacheInput) {
    const normalizedAddress = this.normalizeAddress(address);
    const normalizedBalance = normalizeBalanceCacheData(balance);
    const row: BalanceRow = {
      ...normalizedBalance,
      address: normalizedAddress,
      _id: normalizedAddress,
      _updated_at: Date.now(),
    };

    await db.balance.put(row);
  }

  deleteForAddress(address: string) {
    return db.balance.where('address').equalsIgnoreCase(address).delete();
  }
}

export const balanceDbService = new BalanceDbService();
