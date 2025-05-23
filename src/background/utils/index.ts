import pageStateCache from '../service/pageStateCache';
import { isManifestV3 } from '@/utils/env';
import { addHexPrefix, bytesToHex, toBytes } from '@ethereumjs/util';
import browser from 'webextension-polyfill';
export { default as createPersistStore } from './persistStore';

// {a:{b: string}} => {1: 'a.b'}
// later same [source] value will override [result] key generated before
const retrieveValuePath = (obj) => {
  const arr = [...Object.entries(obj)];
  const result = {};
  const parentKey: string[] = [];
  let lastParent;

  while (arr.length) {
    const curNode = arr.shift();
    const [key, value] = curNode!;
    if (lastParent && lastParent[key] !== value) {
      parentKey.pop();
    }

    if (typeof value === 'object') {
      arr.unshift(...Object.entries(value!));
      parentKey.push(key);
      lastParent = value;
    } else if (typeof value === 'string') {
      result[value] = `${[...parentKey, key].join('.')}`;
    }
  }

  return result;
};

export const underline2Camelcase = (str: string) => {
  return str.replace(/_(.)/g, (m, p1) => p1.toUpperCase());
};

export { retrieveValuePath };
export { default as PromiseFlow } from './promiseFlow';

export function normalizeAddress(input: number | string): string {
  if (!input) {
    return '';
  }

  if (typeof input === 'number') {
    const buffer = toBytes(input);
    input = bytesToHex(buffer);
  }

  if (typeof input !== 'string') {
    let msg = 'eth-sig-util.normalize() requires hex string or integer input.';
    msg += ` received ${typeof input}: ${input}`;
    throw new Error(msg);
  }

  return addHexPrefix(input);
}

export const setPageStateCacheWhenPopupClose = (data) => {
  const cache = pageStateCache.get();
  if (cache && cache.path === '/import/wallet-connect') {
    pageStateCache.set({
      ...cache,
      states: {
        ...cache.states,
        data,
      },
    });
  }
};

export const hasWalletConnectPageStateCache = () => {
  const cache = pageStateCache.get();
  if (cache && cache.path === '/import/wallet-connect') {
    return true;
  }
  return false;
};

export const isSameAddress = (a: string, b: string) => {
  return a.toLowerCase() === b.toLowerCase();
};

export const setPopupIcon = (
  type: 'default' | 'rabby' | 'metamask' | 'locked'
) => {
  const icons = [16, 19, 32, 48, 128].reduce((res, size) => {
    if (type === 'locked') {
      res[size] = `images/icon-lock-${size}.png`;
    } else {
      res[size] = `images/icon-${size}.png`;
    }
    return res;
  }, {});
  const action = isManifestV3 ? browser.action : browser.browserAction;
  return action.setIcon({
    path: icons,
  });
};

export const withTimeout = <T>(
  promise: Promise<T>,
  timeout: number
): Promise<T> => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('Request timed out')),
      timeout
    );
    promise
      .then((result: T) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((err: any) => {
        clearTimeout(timer);
        reject(err);
      });
  });
};

global.__rb_is = () => true;

declare global {
  function __rb_is(): boolean;
}
