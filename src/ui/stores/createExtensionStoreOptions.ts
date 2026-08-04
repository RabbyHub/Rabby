import type {
  PersistedStoreKey,
  PersistedStorePatch,
  PersistedStoreSnapshot,
} from '@/types/persistedStore';
import { onBackgroundStoreChanged } from '@/ui/utils/broadcastToUI';
import { wallet } from '@/ui/wallet';
import type { RabbyStoreOptions } from './createRabbyStore';
import { createSyncedBackgroundStorage } from './createSyncedBackgroundStorage';

type ExtensionStoreOptions<
  State extends Record<string, unknown>,
  Key extends PersistedStoreKey
> = Omit<RabbyStoreOptions<State>, 'storage' | 'sync'> & {
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
}: ExtensionStoreOptions<State, Key>): RabbyStoreOptions<State> => {
  const { storage, syncEngine } = createSyncedBackgroundStorage<State>({
    async get() {
      const snapshot = (await wallet.getStorageSnapshot(
        storageKey
      )) as PersistedStoreSnapshot<Key>;
      return {
        revision: snapshot.revision,
        state: (snapshot.state as unknown) as Partial<State>,
      };
    },
    async set({ partials }) {
      await wallet.setStorageItem(
        storageKey,
        (partials as unknown) as PersistedStorePatch<Key>
      );
    },
    subscribe(listener) {
      return onBackgroundStoreChanged(storageKey, ({ partials, revision }) => {
        listener({
          revision,
          state: partials as Partial<State>,
        });
      });
    },
  });

  return {
    ...options,
    storage,
    sync: { engine: syncEngine },
  };
};
