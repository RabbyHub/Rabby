import LRU from 'lru-cache';
import { createPersistStore } from 'background/utils';

export interface ConnectedSite {
  origin: string;
  icon: string;
  name: string;
  chain?: string;
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
    const cache: ReadonlyArray<
      LRU.Entry<string, ConnectedSite>
    > = this.store.dumpCache.map((item) => ({
      k: item.k,
      v: item.v,
      e: 0,
    }));
    this.lruCache.load(cache);
  };

  addConnectedSite = (origin, name, icon) => {
    if (!this.lruCache) return;
    this.lruCache.set(origin, { origin, name, icon });
    this.store.dumpCache = this.lruCache.dump();
  };

  touchConnectedSite = (origin) => {
    if (!this.lruCache) return;
    this.lruCache.get(origin);
    this.store.dumpCache = this.lruCache.dump();
  };

  hasPerssmion = (origin) => {
    if (!this.lruCache) return;

    return this.lruCache.has(origin);
  };

  getRecentConnectSites = (max = 5) => {
    if (!this.lruCache) return;

    return this.lruCache.values().slice(0, max);
  };

  getConnectedSites = () => {
    if (!this.lruCache) return;

    return this.lruCache.values();
  };

  removeConnectedSite = (origin) => {
    if (!this.lruCache) return;

    this.lruCache.del(origin);
    this.store.dumpCache = this.lruCache.dump();
  };
}

export default new Permission();
