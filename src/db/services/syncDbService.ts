import { db } from '..';
import { SyncItemRow } from '../schema/sync';

class SyncDbService {
  private buildId(address: string, scene: string) {
    return `${address.toLowerCase()}-${scene}`;
  }

  async getSyncState({
    address,
    scene,
  }: {
    address: string;
    scene: 'history' | string;
  }) {
    return db.sync
      .where('[address+type]')
      .equals([address.toLowerCase(), scene])
      .first();
  }

  async getUpdatedAt({
    address,
    scene,
  }: {
    address: string;
    scene: 'history' | string;
  }) {
    return this.getSyncState({
      address,
      scene,
    }).then((item) => item?.updatedAt);
  }

  async updateSyncState({
    address,
    scene,
    patch,
  }: {
    address: string;
    scene: 'history' | string;
    patch: Partial<Omit<SyncItemRow, '_id' | 'address' | 'type'>>;
  }) {
    const current = await this.getSyncState({
      address,
      scene,
    });
    return db.sync.put({
      _id: this.buildId(address, scene),
      address: address.toLowerCase(),
      type: scene,
      updatedAt: current?.updatedAt || 0,
      ...current,
      ...patch,
    });
  }

  async setUpdatedAt({
    address,
    scene,
    updatedAt,
  }: {
    address: string;
    scene: 'history' | string;
    updatedAt: number;
  }) {
    return this.updateSyncState({
      address,
      scene,
      patch: {
        updatedAt,
      },
    });
  }
  deleteForAddress(address: string) {
    return db.sync.where('address').equalsIgnoreCase(address).delete();
  }
}

export const syncDbService = new SyncDbService();
