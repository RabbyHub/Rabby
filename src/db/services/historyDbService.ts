import { db } from '..';
import { TxHistoryItemRow } from '../schema/history';

class HistoryDbService {
  async updateTransactionsCache({
    address,
    rows,
  }: {
    address: string;
    rows: TxHistoryItemRow[];
  }) {
    await db.history.where('owner_addr').equals(address.toLowerCase()).delete();
    await db.history.bulkPut(
      rows.map((item) => ({
        ...item,
      }))
    );
  }

  async getTransactionsCache(address: string) {
    const rows = await db.history
      .where('owner_addr')
      .equals(address.toLowerCase())
      .reverse()
      .sortBy('time_at');
    return rows;
  }
}

export const historyDbService = new HistoryDbService();
