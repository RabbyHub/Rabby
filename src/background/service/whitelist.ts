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
    return this.store.enabled;
  };

  isInWhiteList = (address: string) => {
    return this.store.whitelists.some((item) => isSameAddress(item, address));
  };
}

export default new WhitelistService();
