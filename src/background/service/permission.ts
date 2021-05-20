import LRU from 'lru-cache';
import { createPersistStore } from 'background/utils';
import { CHAINS_ENUM } from 'consts';

export interface ConnectedSite {
  origin: string;
  icon: string;
  name: string;
  chain: CHAINS_ENUM;
  e?: number;
}

type PermissionStore = {
  dumpCache: ReadonlyArray<LRU.Entry<string, ConnectedSite>>;
};

class Permission {
  store: PermissionStore = {
    dumpCache: [],
  };
  lruCache: LRU<string, ConnectedSite> | undefined;

  init = async () => {
    const storage = await createPersistStore<PermissionStore>({
      name: 'permission',
    });
    this.store = storage || this.store;

    this.lruCache = new LRU();
    const cache: ReadonlyArray<LRU.Entry<string, ConnectedSite>> = (
      this.store.dumpCache || []
    ).map((item) => ({
      k: item.k,
      v: item.v,
      e: 0,
    }));
    this.lruCache.load(cache);
  };

  sync = () => {
    if (!this.lruCache) return;
    this.store.dumpCache = this.lruCache.dump();
  };

  getWithoutUpdate = (key: string) => {
    if (!this.lruCache) return;

    return this.lruCache.peek(key);
  };

  addConnectedSite = (
    origin: string,
    name: string,
    icon: string,
    defaultChain: CHAINS_ENUM
  ) => {
    if (!this.lruCache) return;

    this.lruCache.set(origin, { origin, name, icon, chain: defaultChain });
    this.sync();
  };

  touchConnectedSite = (origin) => {
    if (!this.lruCache) return;
    this.lruCache.get(origin);
    this.sync();
  };

  updateConnectSite = (origin: string, value: ConnectedSite) => {
    if (!this.lruCache || !this.lruCache.has(origin)) return;
    this.lruCache.set(origin, value);
    this.sync();
  };

  hasPerssmion = (origin) => {
    if (!this.lruCache) return;

    return this.lruCache.has(origin);
  };

  getRecentConnectSites = (max = 5) => {
    return this.lruCache?.values().slice(0, max) || [];
  };

  getConnectedSites = () => {
    return this.lruCache?.values() || [];
  };

  removeConnectedSite = (origin) => {
    if (!this.lruCache) return;

    this.lruCache.del(origin);
    this.sync();
  };
}

export default new Permission();
