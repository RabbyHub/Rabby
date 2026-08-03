type FieldName<State> = Extract<keyof State, string>;

export type StorageWriteContext<State> = {
  changedKeys: FieldName<State>[];
  previousState: Partial<State>;
  state: Partial<State>;
};

export type BackgroundStoreStorage<State> = {
  get: () => Promise<Partial<State>>;
  set: (context: StorageWriteContext<State>) => Promise<void>;
};

export type BackgroundStoreSyncEngine<State> = {
  subscribe: (listener: (state: Partial<State>) => void) => () => void;
};

type SyncedBackgroundStorageOptions<State> = {
  get: () => Promise<Partial<State>>;
  set: (context: StorageWriteContext<State>) => Promise<void>;
  subscribe: (listener: (state: Partial<State>) => void) => () => void;
};

/**
 * Connects a UI store to a background service without coupling Zustand to the
 * transport. The storage adapter handles request/response persistence, while
 * the sync engine handles background broadcasts back to every UI context.
 */
export const createSyncedBackgroundStorage = <State>(
  options: SyncedBackgroundStorageOptions<State>
) => {
  const storage: BackgroundStoreStorage<State> = {
    get: options.get,
    set: options.set,
  };
  const syncEngine: BackgroundStoreSyncEngine<State> = {
    subscribe: options.subscribe,
  };

  return { storage, syncEngine };
};
