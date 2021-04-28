import { storage } from 'background/webapi';
import { debounce } from 'debounce';

const persistStorage = (name, obj) => debounce(storage.set(name, obj), 1000);

const createPersistStore = async ({
  name,
  origin = Object.create(null),
  fromStorage = true,
}) => {
  let template = origin;

  if (fromStorage) {
    template = await storage.get(name) || origin;
  }

  const createProxy = (obj) => new Proxy(obj, {
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
    }
  });

  return createProxy(template);
}

export default createPersistStore;
