/* eslint-disable @typescript-eslint/ban-types */
import { storage } from 'background/webapi';
import { debounce } from 'debounce';

const persistStorage = (name: string, obj: object) => {
  debounce(storage.set(name, obj), 1000);
};

interface CreatePersistStoreParams<T> {
  name: string;
  template?: T;
  fromStorage?: boolean;
}

const createPersistStore = async <T extends object>({
  name,
  template = Object.create(null),
  fromStorage = true,
}: CreatePersistStoreParams<T>): Promise<T> => {
  let tpl = template;

  if (fromStorage) {
    const storageCache = await storage.get(name);
    tpl = storageCache || template;
    if (!storageCache) {
      await storage.set(name, tpl);
    }
  }

  const raw = Symbol('raw');

  const createProxy = <A extends object>(
    obj: A,
    setCall,
    cacheProxy = new Map()
  ): A =>
    new Proxy(obj, {
      get(target, prop) {
        if (prop === raw) {
          return target;
        }

        const oldValue = target[prop];
        if (
          ['[object Object]', '[object Array]'].indexOf(
            Object.prototype.toString.call(oldValue)
          ) > -1
        ) {
          if (!cacheProxy.has(oldValue)) {
            cacheProxy.set(
              oldValue,
              createProxy(oldValue, setCall, cacheProxy)
            );
          }
          return cacheProxy.get(oldValue);
        }

        return oldValue;
      },
      set(target, prop, value) {
        target[prop] = value;
        setCall(name, target);

        return true;
      },
      deleteProperty(target, prop) {
        if (Reflect.has(target, prop)) {
          Reflect.deleteProperty(target, prop);
          setCall(name, target);
        }

        return true;
      },
    });

  const callback = () => persistStorage(name, result[raw]);
  const result = createProxy<T>(tpl, callback);

  return result;
};

export default createPersistStore;
