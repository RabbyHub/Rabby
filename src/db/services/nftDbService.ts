import { CollectionList } from '@rabby-wallet/rabby-api/dist/types';
import { db } from '..';
import { NFTCollectionRow } from '../schema/nft';

class NFTDbService {
  private normalizeAddress(address: string) {
    return address.toLowerCase();
  }

  private buildId(
    address: string,
    collection: Pick<CollectionList, 'chain' | 'id'>
  ) {
    return `${this.normalizeAddress(address)}-${
      collection.chain
    }-${collection.id.toLowerCase()}`;
  }

  private fillRows(address: string, collections: CollectionList[]) {
    const updatedAt = Date.now();

    return collections.map<NFTCollectionRow>((collection) => ({
      ...collection,
      owner_addr: this.normalizeAddress(address),
      _id: this.buildId(address, collection),
      _updated_at: updatedAt,
    }));
  }

  async queryCollections(
    address: string,
    chain?: string
  ): Promise<CollectionList[]> {
    const normalizedAddress = this.normalizeAddress(address);

    if (chain) {
      return db.nft
        .where('[owner_addr+chain]')
        .equals([normalizedAddress, chain])
        .toArray();
    }

    return db.nft.where('owner_addr').equals(normalizedAddress).toArray();
  }

  async replaceAddressCollections(
    address: string,
    collections: CollectionList[]
  ) {
    const normalizedAddress = this.normalizeAddress(address);
    const rows = this.fillRows(address, collections);

    await db.transaction('rw', db.nft, async () => {
      await db.nft.where('owner_addr').equals(normalizedAddress).delete();

      if (rows.length) {
        await db.nft.bulkPut(rows);
      }
    });
  }

  deleteForAddress(address: string) {
    return db.nft.where('owner_addr').equalsIgnoreCase(address).delete();
  }
}

export const nftDbService = new NFTDbService();
