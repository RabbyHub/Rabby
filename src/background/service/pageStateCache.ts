import { createPersistStore } from 'background/utils';

export interface CacheState {
  path: string;
  params?: Record<string, string>;
  states: Record<string, any>;
  search?: string;
}

interface CacheStore {
  cache: CacheState | null;
  hasCache: boolean;
}

class PageStateCacheService {
  store: CacheStore | null = null;

  init = async () => {
    this.store = await createPersistStore<CacheStore>({
      name: 'pageStateCache',
      template: {
        cache: {
          path: '',
          params: {},
          states: {},
        },
        hasCache: false,
      },
    });
  };

  has = () => {
    if (!this.store) return false;

    return this.store.hasCache;
  };

  get = (): CacheState | null => {
    if (!this.store) return null;

    if (this.has()) {
      return this.store.cache!;
    }

    return null;
  };

  set = (cache: CacheState) => {
    if (!this.store) return;
    this.store.cache = cache;
    this.store.hasCache = true;
  };

  clear = () => {
    if (!this.store) return;

    this.store.cache = {
      path: '',
      params: {},
      states: {},
    };
    this.store.hasCache = false;
  };
}

export default new PageStateCacheService();
