import { isRuntimeError } from 'background/common';

class CacheStorage {
  cacheMap = new Map();

  async get(prop) {
    if (this.cacheMap.has(prop)) {
      return this.cacheMap.get(prop);
    }

    return new Promise((resolve, reject) => {
      chrome.storage.local.get(null, (result) => {
        try {
          isRuntimeError();
          this.cacheMap.set(prop, result[prop]);
          resolve(result[prop]);
        } catch (err) {
          reject(err);
        }
      });
    });
  }

  async set(prop, value) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [prop]: value }, (result) => {
        try {
          isRuntimeError();
          this.cacheMap.set(prop, value);

          resolve(result);
        } catch (err) {
          reject(err);
        }
      });
    });
  }
}

export default new CacheStorage();
