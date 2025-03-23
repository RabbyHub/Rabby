import browser from 'webextension-polyfill';

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
    const init: CacheStore = {
      cache: {
        path: '',
        params: {},
        states: {},
      },
      hasCache: false,
    };
    await browser.storage.session.set({
      pageStateCache: init,
    });
    this.store = init;
  };

  has = () => {
    if (!this.store) return null;

    return this.store.hasCache;
  };

  get = (): CacheState | null => {
    if (!this.store) return null;

    if (this.has()) {
      return this.store.cache!;
    }

    return null;
  };

  set = async (cache: CacheState) => {
    if (!this.store) return;
    this.store.cache = cache;
    this.store.hasCache = true;
    this.syncData();
  };

  clear = () => {
    if (!this.store) return;

    this.store.cache = {
      path: '',
      params: {},
      states: {},
    };
    this.store.hasCache = false;
    this.syncData();
  };

  syncData = async () => {
    await browser.storage.session.set({
      pageStateCache: this.store,
    });
  };
}

export default new PageStateCacheService();
