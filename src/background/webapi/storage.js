import { isRuntimeError } from 'background/common';
import { storage } from '.';

const cacheMap = new Map();

const get = async (prop) => {
  if (cacheMap.has(prop)) {
    return cacheMap.get(prop);
  }

  return new Promise((resolve, reject) => {
    chrome.storage.local.get(null, (result) => {
      try {
        isRuntimeError();
        cacheMap.set(prop, result[prop]);
        resolve(result[prop]);
      } catch (err) {
        reject(err);
      }
    });
  });
};

const set = async (prop, value) => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [prop]: value }, (result) => {
      try {
        isRuntimeError();
        cacheMap.set(prop, value);

        resolve(result);
      } catch (err) {
        reject(err);
      }
    });
  });
};

;

export default {
  get,
  set,
};
