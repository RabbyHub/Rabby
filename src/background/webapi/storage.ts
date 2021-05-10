import { browser } from 'webextension-polyfill-ts';

const cacheMap = new Map();

const get = async (prop) => {
  if (cacheMap.has(prop)) {
    return cacheMap.get(prop);
  }

  const result = await browser.storage.local.get(null);
  cacheMap.set(prop, result[prop]);
  return result[prop];
};

const set = async (prop, value): Promise<void> => {
  await browser.storage.local.set({ [prop]: value });
  cacheMap.set(prop, value);
};

export default {
  get,
  set,
};
