import type {
  PersistedStoreKey,
  PersistedStoreMap,
} from '@/types/persistedStore';
import { onBackgroundStoreChanged } from '@/ui/utils/broadcastToUI';
import { wallet } from '@/ui/wallet';
import type { BaseStoreOptions } from './createBaseStore';
import { createSyncedBackgroundStorage } from './createSyncedBackgroundStorage';

type ExtensionStoreOptions<
  State extends Record<string, unknown>,
  Key extends PersistedStoreKey
> = Omit<BaseStoreOptions<State>, 'storage' | 'sync'> & {
  storageKey: Key;
};

/**
 * Zustand persistence adapter backed by Rabby's background service stores.
 * Its API mirrors a localStorage-style getItem/setItem pair, while remote
 * changes are delivered through the existing background broadcast channel.
 */
export const createExtensionStoreOptions = <
  State extends Record<string, unknown>,
  Key extends PersistedStoreKey
>({
  storageKey,
  ...options
}: ExtensionStoreOptions<State, Key>): BaseStoreOptions<State> => {
  const { storage, syncEngine } = createSyncedBackgroundStorage<State>({
    async get() {
      return ((await wallet.getStorageItem(
        storageKey
      )) as unknown) as Partial<State>;
    },
    async set({ state }) {
      await wallet.setStorageItem(
        storageKey,
        (state as unknown) as PersistedStoreMap[Key]
      );
    },
    subscribe(listener) {
      return onBackgroundStoreChanged(storageKey, ({ partials }) => {
        listener(partials as Partial<State>);
      });
    },
  });

  return {
    ...options,
    storage,
    sync: { engine: syncEngine },
  };
};
