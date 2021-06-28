import { browser } from 'webextension-polyfill-ts';

let cacheMap;

const get = async (prop?) => {
  if (cacheMap) {
    return cacheMap.get(prop);
  }

  const result = await browser.storage.local.get(null);

  cacheMap = new Map(Object.entries(result).map(([k, v]) => [k, v]));
  return prop ? result[prop] : result;
};

const set = async (prop, value): Promise<void> => {
  await browser.storage.local.set({ [prop]: value });
  cacheMap.set(prop, value);
};

export default {
  get,
  set,
};
