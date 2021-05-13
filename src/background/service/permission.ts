import LRU from 'lru-cache';
import { createPersistStore } from 'background/utils';

export interface ConnectedSite {
  origin: string;
  icon: string;
  name: string;
  chain?: string;
}

type PermissionStore = {
  dumpCache: ConnectedSite[];
};

class Permission {
  store!: PermissionStore;
  lruCache: any;

  init = async () => {
    this.store = await createPersistStore<PermissionStore>({
      name: 'permission',
    });

    this.lruCache = new LRU();
    this.lruCache.load(this.store.dumpCache);
  };

  addConnectedSite = (origin, name, icon) => {
    this.lruCache.set(origin, { origin, name, icon });
    this.store.dumpCache = this.lruCache.dump();
  };

  touchConnectedSite = (origin) => {
    this.lruCache.get(origin);
    this.store.dumpCache = this.lruCache.dump();
  };

  hasPerssmion = (origin) => {
    return this.lruCache.has(origin);
  };

  getConnectedSites = () => {
    return this.lruCache.values();
  };

  removeConnectedSite = (origin) => {
    this.lruCache.del(origin);
    this.store.dumpCache = this.lruCache.dump();
  };
}

export default new Permission();
