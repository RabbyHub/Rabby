export function makeAvoidParallelFunc<T extends (...args: any[]) => any>(
  func: T
) {
  const executingRef = { current: false };

  const wrappedFunc = (...args: Parameters<T>): void => {
    if (executingRef.current) return;

    let err: Error | null = null;
    try {
      executingRef.current = true;
      return func(...args);
    } catch (error) {
      err = error as Error;
    } finally {
      executingRef.current = false;
    }

    if (err) throw err;
  };

  return wrappedFunc;
}

export function makeAvoidParallelAsyncFunc<
  T extends (...args: any[]) => Promise<any>
>(func: T) {
  // type RetValue = Awaited<ReturnType<T>>;
  type PromiseRet = Promise<Awaited<ReturnType<T>>>;
  const promiseRef = { current: null as PromiseRet | null };

  const wrappedFunc = async (
    ...args: Parameters<T>
  ): Promise<Awaited<ReturnType<T>>> => {
    if (promiseRef.current) return promiseRef.current;

    let ret: PromiseRet | Error;
    try {
      ret = func(...args);

      if (typeof ret.then === 'function')
        promiseRef.current = ret as ReturnType<T>;

      await ret;
    } catch (error) {
      ret = error as Error;
    } finally {
      promiseRef.current = null;
    }

    if (ret instanceof Error) throw ret;

    return ret;
  };

  return wrappedFunc;
}

const swrPromisesRef: Partial<Record<string, Promise<any> | null>> = {};
type StringOrList = string | string[];
type InputKey<T extends (...args: any[]) => any> =
  | StringOrList
  | ((ctx: { args: Parameters<T> }) => StringOrList);

function ensureStringKey(key: StringOrList): string {
  return Array.isArray(key) ? key.join('__') : key;
}

function setSwrPromise(key: string | null, pValue: Promise<any> | null) {
  if (!key) return;

  swrPromisesRef[key] = pValue;
}

export function makeSWRKeyAsyncFunc<
  T extends (...args: any[]) => Promise<any>,
  InputT extends InputKey<T>
>(func: T, keyOrList: InputT) {
  const keyFunc =
    typeof keyOrList === 'function'
      ? // eslint-disable-next-line @typescript-eslint/ban-types
        (keyOrList as Extract<InputT, Function>)
      : null;
  const staticKey =
    typeof keyOrList === 'function' ? null : ensureStringKey(keyOrList);

  type PromiseRet = Promise<Awaited<ReturnType<T>>>;
  const wrappedFunc = async (
    ...args: Parameters<T>
  ): Promise<ReturnType<T>> => {
    const key = keyFunc ? ensureStringKey(keyFunc({ args })) : staticKey;
    if (key && swrPromisesRef[key]) return swrPromisesRef[key];

    let ret: PromiseRet | Error;
    try {
      ret = func(...args);

      if (typeof ret.then === 'function')
        setSwrPromise(key, ret as ReturnType<T>);

      await ret;
    } catch (error) {
      ret = error as Error;
    } finally {
      setSwrPromise(key, null);
    }

    if (ret instanceof Error) throw ret;

    return ret;
  };

  return wrappedFunc;
}
