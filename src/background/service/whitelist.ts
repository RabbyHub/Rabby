import { createPersistStore } from 'background/utils';
import { isSameAddress } from 'background/utils';

export type WhitelistStore = {
  enabled: boolean;
  whitelists: string[];
};

class WhitelistService {
  store: WhitelistStore = {
    enabled: true,
    whitelists: [],
  };

  init = async () => {
    const storage = await createPersistStore<WhitelistStore>({
      name: 'whitelist',
      template: {
        enabled: true,
        whitelists: [],
      },
    });
    this.store = storage || this.store;
  };

  getWhitelist = () => {
    return this.store.whitelists;
  };

  enableWhitelist = () => {
    this.store.enabled = true;
  };

  disableWhiteList = () => {
    this.store.enabled = false;
  };

  setWhitelist = (addresses: string[]) => {
    this.store.whitelists = addresses.map((address) => address.toLowerCase());
  };

  updateWhitelistOrder = (addresses: string[]) => {
    if (!Array.isArray(addresses)) {
      throw new Error('Invalid whitelist order');
    }

    const current = this.store.whitelists.map((address) =>
      address.toLowerCase()
    );
    const next = addresses.map((address) => {
      if (typeof address !== 'string' || !address) {
        throw new Error('Invalid whitelist order');
      }
      return address.toLowerCase();
    });

    const currentSet = new Set(current);
    const nextSet = new Set(next);

    if (
      current.length !== next.length ||
      currentSet.size !== current.length ||
      nextSet.size !== next.length ||
      current.some((address) => !nextSet.has(address)) ||
      next.some((address) => !currentSet.has(address))
    ) {
      throw new Error('Invalid whitelist order');
    }

    this.store.whitelists = next;
  };

  removeWhitelist = (address: string) => {
    if (!this.store.whitelists.find((item) => isSameAddress(item, address)))
      return;
    this.store.whitelists = this.store.whitelists.filter(
      (item) => !isSameAddress(item, address)
    );
  };

  addWhitelist = (address: string) => {
    if (!address) return;
    if (this.store.whitelists.find((item) => isSameAddress(item, address)))
      return;
    this.store.whitelists = [...this.store.whitelists, address.toLowerCase()];
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
