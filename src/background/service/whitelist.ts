import { createPersistStore } from 'background/utils';
import { isSameAddress } from 'background/utils';

export type WhitelistStore = {
  enabled: boolean;
  whitelists: string[];
  addressCreatedAt: Record<string, number>; // 新增：地址到创建时间的映射
};

class WhitelistService {
  store: WhitelistStore = {
    enabled: true,
    whitelists: [],
    addressCreatedAt: {},
  };

  init = async () => {
    const storage = await createPersistStore<WhitelistStore>({
      name: 'whitelist',
      template: {
        enabled: true,
        whitelists: [],
        addressCreatedAt: {},
      },
    });
    this.store = storage || this.store;
  };

  getWhitelist = () => {
    return this.store.whitelists.sort((a, b) => {
      const timeA = this.store.addressCreatedAt[a] || 0;
      const timeB = this.store.addressCreatedAt[b] || 0;
      return timeB - timeA; // Sort by newest first
    });
  };

  enableWhitelist = () => {
    this.store.enabled = true;
  };

  disableWhiteList = () => {
    this.store.enabled = false;
  };

  setWhitelist = (addresses: string[]) => {
    const normalizedAddresses = addresses.map((address) =>
      address.toLowerCase()
    );
    this.store.whitelists = normalizedAddresses;
    // Ensure all addresses have creation time, use current time for new ones
    const currentTime = Date.now();
    normalizedAddresses.forEach((addr) => {
      if (!this.store.addressCreatedAt[addr]) {
        this.store.addressCreatedAt[addr] = currentTime;
      }
    });
    // Clean up creation times for addresses that are no longer in the whitelist
    const addressSet = new Set(normalizedAddresses);
    Object.keys(this.store.addressCreatedAt).forEach((addr) => {
      if (!addressSet.has(addr)) {
        delete this.store.addressCreatedAt[addr];
      }
    });
  };

  removeWhitelist = (address: string) => {
    if (!this.store.whitelists.find((item) => isSameAddress(item, address)))
      return;
    this.store.whitelists = this.store.whitelists.filter(
      (item) => !isSameAddress(item, address)
    );
    delete this.store.addressCreatedAt[address.toLowerCase()];
  };

  addWhitelist = (address: string) => {
    if (!address) return;
    if (this.store.whitelists.find((item) => isSameAddress(item, address)))
      return;
    const addr = address.toLowerCase();
    this.store.whitelists = [...this.store.whitelists, addr];
    this.store.addressCreatedAt[addr] = Date.now();
  };

  isWhitelistEnabled = () => {
    // ignore user option from now
    // return this.store.enabled;
    return true;
  };

  isInWhiteList = (address: string) => {
    return this.store.whitelists.some((item) => isSameAddress(item, address));
  };
}

export default new WhitelistService();
