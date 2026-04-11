import { ComplexProtocol } from '@rabby-wallet/rabby-api/dist/types';
import { db } from '..';
import { DefiProtocolRow } from '../schema/defi';

class DefiDbService {
  private normalizeAddress(address: string) {
    return address.toLowerCase();
  }

  private buildId(
    address: string,
    protocol: Pick<ComplexProtocol, 'chain' | 'id'>
  ) {
    return `${this.normalizeAddress(address)}-${
      protocol.chain
    }-${protocol.id.toLowerCase()}`;
  }

  private fillRows(address: string, protocols: ComplexProtocol[]) {
    const updatedAt = Date.now();

    return protocols.map<DefiProtocolRow>((protocol) => ({
      ...protocol,
      owner_addr: this.normalizeAddress(address),
      _id: this.buildId(address, protocol),
      _updated_at: updatedAt,
    }));
  }

  async queryProtocols(
    address: string,
    chain?: string
  ): Promise<ComplexProtocol[]> {
    const normalizedAddress = this.normalizeAddress(address);

    if (chain) {
      return db.defi
        .where('[owner_addr+chain]')
        .equals([normalizedAddress, chain])
        .toArray();
    }

    return db.defi.where('owner_addr').equals(normalizedAddress).toArray();
  }

  async replaceAddressProtocols(address: string, protocols: ComplexProtocol[]) {
    const normalizedAddress = this.normalizeAddress(address);
    const rows = this.fillRows(address, protocols);

    await db.transaction('rw', db.defi, async () => {
      await db.defi.where('owner_addr').equals(normalizedAddress).delete();

      if (rows.length) {
        await db.defi.bulkPut(rows);
      }
    });
  }

  deleteForAddress(address: string) {
    return db.defi.where('owner_addr').equalsIgnoreCase(address).delete();
  }
}

export const defiDbService = new DefiDbService();
