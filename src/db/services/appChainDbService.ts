import { AppChainItem } from '@rabby-wallet/rabby-api/dist/types';
import { db } from '..';
import { AppChainItemRow } from '../schema/appChain';

class AppChainDbService {
  private normalizeAddress(address: string) {
    return address.toLowerCase();
  }

  private buildId(address: string, appChain: Pick<AppChainItem, 'id'>) {
    return `${this.normalizeAddress(address)}-${appChain.id.toLowerCase()}`;
  }

  private fillRows(address: string, appChains: AppChainItem[]) {
    const updatedAt = Date.now();

    return appChains.map<AppChainItemRow>((appChain) => ({
      ...appChain,
      owner_addr: this.normalizeAddress(address),
      _id: this.buildId(address, appChain),
      _updated_at: updatedAt,
    }));
  }

  async queryAppChains(address: string): Promise<AppChainItem[]> {
    const normalizedAddress = this.normalizeAddress(address);

    return db.appChain.where('owner_addr').equals(normalizedAddress).toArray();
  }

  async replaceAddressAppChains(address: string, appChains: AppChainItem[]) {
    const normalizedAddress = this.normalizeAddress(address);
    const rows = this.fillRows(address, appChains);

    await db.transaction('rw', db.appChain, async () => {
      await db.appChain.where('owner_addr').equals(normalizedAddress).delete();

      if (rows.length) {
        await db.appChain.bulkPut(rows);
      }
    });
  }

  deleteForAddress(address: string) {
    return db.appChain.where('owner_addr').equalsIgnoreCase(address).delete();
  }
}

export const appChainDbService = new AppChainDbService();
