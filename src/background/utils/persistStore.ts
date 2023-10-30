/* eslint-disable @typescript-eslint/ban-types */
import { storage } from 'background/webapi';
import { debounce } from 'debounce';
import { syncStateToUI } from './broadcastToUI';
import { BROADCAST_TO_UI_EVENTS } from '@/utils/broadcastToUI';

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
    tpl = Object.assign({}, template, storageCache);
    // tpl = storageCache || template;
    if (!storageCache) {
      await storage.set(name, tpl);
    }
  }

  const store = new Proxy(tpl, {
    set(target, prop, value) {
      target[prop] = value;

      persistStorage(name, target);

      syncStateToUI(BROADCAST_TO_UI_EVENTS.storeChanged, {
        bgStoreName: name,
        changedKey: prop as string,
        changedKeys: [prop as string],
        partials: {
          [prop]: value,
        },
      });

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

  return store;
};

export default createPersistStore;
