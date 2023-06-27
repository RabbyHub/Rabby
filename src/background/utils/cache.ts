// cached any function with a key and a timer
export const cached = <T>(
  fn: (...args: any[]) => Promise<T>,
  timer = 3 * 60 * 1000
) => {
  const cache: {
    [key: string]: {
      expire: number;
      value: T;
    };
  } = {};
  return async (args: any[], key: string, force: boolean) => {
    const now = Date.now();

    if (!force && cache[key] && cache[key].expire > now) {
      return cache[key].value;
    }

    const res = await fn(...args);
    cache[key] = {
      expire: now + timer,
      value: res,
    };

    return res;
  };
};
