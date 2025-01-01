import { IExtractFromPromise } from '@/ui/utils/type';
import { appIsDev } from '@/utils/env';

// cached any function with a key and a timer
export const cached = <T extends (...args: any[]) => Promise<any>>(
  name: string,
  fn: T,
  /**
   * @description
   *
   * - if a number is passed, it will be used as the timeout
   * - if an object is passed, it will be used as the options
   *
   * `timeout` is the time in milliseconds before the cache expires
   * `maxSize` is the number of items to keep in the cache, if 0, no limit
   */
  _options?: number | { timeout: number; maxSize?: number }
) => {
  const options =
    typeof _options === 'number' ? { timeout: _options } : _options;

  const { timeout = 3 * 60 * 1000, maxSize = 0 } = options || {};

  const cache: {
    [key: string]: {
      expire: number;
      value: IExtractFromPromise<ReturnType<T>>;
    };
  } = {};

  if (appIsDev) {
    globalThis[`${name}_cache`] = cache;
  }

  const wrappedFn = async (
    args: Parameters<T>,
    key: string,
    force: boolean
  ): Promise<IExtractFromPromise<ReturnType<T>>> => {
    const now = Date.now();

    if (!force && cache[key] && cache[key].expire > now) {
      return cache[key].value;
    }

    const res = await fn(...args);
    const item = {
      expire: now + timeout,
      value: res,
    };
    cache[key] = item;

    if (maxSize && Object.keys(cache).length > maxSize) {
      const oldestKey = Object.keys(cache).reduce((oldest, key) => {
        if (!oldest || cache[key].expire < cache[oldest].expire) {
          return key;
        }
        return oldest;
      }, '');
      delete cache[oldestKey];
    }

    return res;
  };

  const isExpired = (key: string) => {
    return !cache[key] || cache[key].expire < Date.now();
  };

  const forceExpire = (key: string) => {
    delete cache[key];
  };

  return {
    fn: wrappedFn,
    isExpired,
    forceExpire,
  };
};
