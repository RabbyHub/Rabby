/* eslint-disable @typescript-eslint/ban-types */
import { storage } from 'background/webapi';
import { debounce } from 'debounce';

const persistStorage = (name: string, obj: object) =>
  debounce(storage.set(name, obj), 1000);

interface CreatePersistStoreParams<T> {
  name: string;
  origin?: T;
  fromStorage?: boolean;
}

const createPersistStore = async <T extends object>({
  name,
  origin = Object.create(null),
  fromStorage = true,
}: CreatePersistStoreParams<T>): Promise<T> => {
  let template = origin;

  if (fromStorage) {
    template = (await storage.get(name)) || origin;
  }

  const createProxy = <A extends object>(obj: A): A =>
    new Proxy(obj, {
      set(target, prop, value) {
        if (typeof value === 'object' && value !== null) {
          target[prop] = createProxy(value);
        }

        target[prop] = value;

        persistStorage(name, target);

        return true;
      },

      deleteProperty(target, prop) {
        if (Reflect.has(target, prop)) {
          Reflect.deleteProperty(target, prop);

          persistStorage(name, target);
        }

        return true;
      },
    });

  return createProxy<T>(template);
};

export default createPersistStore;
