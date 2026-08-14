import type {
  PersistedStoreKey,
  PersistedStorePatch,
  PersistedStoreSnapshot,
} from '@/types/persistedStore';
import { onBackgroundStoreChanged } from '@/ui/utils/broadcastToUI';
import { onWalletReconnect, wallet } from '@/ui/wallet';
import type { RabbyStoreOptions } from './createRabbyStore';
import { createSyncedBackgroundStorage } from './createSyncedBackgroundStorage';

type ExtensionStoreOptions<
  State extends Record<string, unknown>,
  Key extends PersistedStoreKey
> = Omit<RabbyStoreOptions<State>, 'storage' | 'sync'> & {
  storageKey: Key;
};

/**
 * Chrome serializes port messages as JSON, which strips object keys whose
 * value is `undefined`. Both directions therefore carry the key list
 * separately so that clearing a field survives the trip instead of silently
 * arriving as "nothing changed".
 */
const clearedKeysOf = (changedKeys: string[], partials: object) =>
  changedKeys.filter(
    (key) => (partials as Record<string, unknown>)[key] === undefined
  );

const restoreClearedKeys = (changedKeys: string[], partials: object) => {
  const state = { ...partials } as Record<string, unknown>;
  changedKeys?.forEach((key) => {
    if (!Object.prototype.hasOwnProperty.call(state, key)) {
      state[key] = undefined;
    }
  });
  return state;
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
        origin: snapshot.origin,
        revision: snapshot.revision,
        state: (snapshot.state as unknown) as Partial<State>,
      };
    },
    async set({ changedKeys, partials }) {
      await wallet.setStorageItem(
        storageKey,
        (partials as unknown) as PersistedStorePatch<Key>,
        clearedKeysOf(changedKeys, partials)
      );
    },
    subscribe(listener) {
      return onBackgroundStoreChanged(
        storageKey,
        ({ changedKeys, origin, partials, revision }) => {
          listener({
            origin,
            revision,
            state: restoreClearedKeys(
              changedKeys as string[],
              partials
            ) as Partial<State>,
          });
        }
      );
    },
    onReconnect: onWalletReconnect,
  });

  return {
    ...options,
    storage,
    sync: { engine: syncEngine },
  };
};
