import { IExtractFromPromise } from '@/ui/utils/type';
import { appIsDev } from '@/utils/env';

// cached any function with a key and a timer
export const cached = <T extends (...args: any[]) => Promise<any>>(
  name: string,
  fn: T,
  timeout = 3 * 60 * 1000
) => {
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
    cache[key] = {
      expire: now + timeout,
      value: res,
    };

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
