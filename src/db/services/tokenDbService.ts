import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import { db } from '..';
import { TokenItemRow } from '../schema/token';

class TokenDbService {
  private normalizeAddress(address: string) {
    return address.toLowerCase();
  }

  private buildId(address: string, token: Pick<TokenItem, 'chain' | 'id'>) {
    return `${this.normalizeAddress(address)}-${
      token.chain
    }-${token.id.toLowerCase()}`;
  }

  private fillRows(address: string, tokens: TokenItem[]) {
    const updatedAt = Date.now();

    return tokens.map<TokenItemRow>((token) => ({
      ...token,
      owner_addr: this.normalizeAddress(address),
      _id: this.buildId(address, token),
      _updated_at: updatedAt,
    }));
  }

  async queryTokens(address: string, chain?: string) {
    const normalizedAddress = this.normalizeAddress(address);

    if (chain) {
      return db.token
        .where('[owner_addr+chain]')
        .equals([normalizedAddress, chain])
        .toArray();
    }

    return db.token.where('owner_addr').equals(normalizedAddress).toArray();
  }

  async replaceAddressTokens(address: string, tokens: TokenItem[]) {
    const normalizedAddress = this.normalizeAddress(address);
    const rows = this.fillRows(address, tokens);

    await db.transaction('rw', db.token, async () => {
      await db.token.where('owner_addr').equals(normalizedAddress).delete();

      if (rows.length) {
        await db.token.bulkPut(rows);
      }
    });
  }

  deleteForAddress(address: string) {
    return db.token.where('owner_addr').equalsIgnoreCase(address).delete();
  }
}

export const tokenDbService = new TokenDbService();
