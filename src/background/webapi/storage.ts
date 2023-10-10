import browser from 'webextension-polyfill';

let cacheMap;

const get = async (prop?) => {
  if (cacheMap) {
    return cacheMap.get(prop);
  }

  const result = await browser.storage.local.get(null);
  cacheMap = new Map(Object.entries(result ?? {}).map(([k, v]) => [k, v]));

  return prop ? result?.[prop] : result;
};

const set = async (prop, value): Promise<void> => {
  await browser.storage.local.set({ [prop]: value });
  cacheMap.set(prop, value);
};

const byteInUse = async (): Promise<number> => {
  return new Promise((resolve, reject) => {
    if (chrome) {
      chrome.storage.local.getBytesInUse((value) => {
        resolve(value);
      });
    } else {
      reject('ByteInUse only works in Chrome');
    }
  });
};

export default {
  get,
  set,
  byteInUse,
};
