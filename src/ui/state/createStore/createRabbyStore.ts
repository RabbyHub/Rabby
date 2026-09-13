import { create, StateCreator, StoreApi, UseBoundStore } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import {
  BackgroundStoreStorage,
  BackgroundStoreSyncEngine,
  BackgroundStoreUpdate,
} from './createSyncedBackgroundStorage';

type SetStateArgs<State> =
  | [
      partial:
        | State
        | Partial<State>
        | ((state: State) => State | Partial<State>),
      replace?: false
    ]
  | [state: State | ((state: State) => State), replace: true];

type SetState<State> = StoreApi<State>['setState'];

const callSet = <State>(set: SetState<State>, args: SetStateArgs<State>) => {
  if (args[1] === true) {
    set(args[0] as State | ((state: State) => State), true);
    return;
  }
  set(args[0], args[1]);
};

type PendingSet<State> = SetStateArgs<State>;
type FieldName<State> = Extract<keyof State, string>;

export type RabbyStoreOptions<State extends Record<string, unknown>> = {
  autoHydrate?: boolean;
  storage: BackgroundStoreStorage<State>;
  sync?: {
    engine: BackgroundStoreSyncEngine<State>;
  };
  partialize?: (state: State) => Partial<State>;
  merge?: (persistedState: Partial<State>, currentState: State) => State;
  onError?: (error: unknown) => void;
};

export type RabbyStoreControls = {
  destroy: () => void;
  flush: () => Promise<void>;
  hasHydrated: () => boolean;
  hydrate: () => Promise<void>;
  hydrationPromise: () => Promise<void>;
};

export type RabbyStore<State extends Record<string, unknown>> = UseBoundStore<
  StoreApi<State>
> & {
  persist: RabbyStoreControls;
};

const defaultPartialize = <State extends Record<string, unknown>>(
  state: State
) => {
  const persistedState: Partial<State> = {};
  Object.entries(state).forEach(([key, value]) => {
    if (typeof value !== 'function') {
      persistedState[
        key as FieldName<State>
      ] = value as State[FieldName<State>];
    }
  });
  return persistedState;
};

/**
 * A small Zustand store for extension UI state.
 *
 * The storage implementation stays outside this helper. Rabby stores inject a
 * wallet-backed adapter, so persistence still goes through UI -> background
 * controller -> background service instead of accessing Chrome Storage here.
 */
export const createRabbyStore = <State extends Record<string, unknown>>(
  initializer: StateCreator<State>,
  options: RabbyStoreOptions<State>
): RabbyStore<State> => {
  const partialize =
    options.partialize || ((state: State) => defaultPartialize(state));
  let hydrated = false;
  let destroyed = false;
  let applyingRemote = false;
  let latestOrigin: string | undefined;
  let latestRevision = -1;
  let latestSnapshotRequest = 0;
  let rawSet!: SetState<State>;
  let writeQueue = Promise.resolve();
  // Boxed so a thrown `undefined` is still reportable.
  let pendingWriteError: { error: unknown } | undefined;
  const pendingLocalUpdates: PendingSet<State>[] = [];
  const pendingSyncedUpdates: BackgroundStoreUpdate<State>[] = [];

  const reportError = (error: unknown) => {
    options.onError?.(error);
  };

  const mergeSnapshot = (persistedState: Partial<State>) => {
    const currentState = store.getState();
    return options.merge
      ? options.merge(persistedState, currentState)
      : ({ ...currentState, ...persistedState } as State);
  };

  const applyRemoteSnapshot = (persistedState: Partial<State>) => {
    applyingRemote = true;
    try {
      rawSet(mergeSnapshot(persistedState), true);
    } finally {
      applyingRemote = false;
    }
  };

  const restoreBackgroundSnapshot = async () => {
    const request = ++latestSnapshotRequest;
    const snapshot = await options.storage.get();
    if (destroyed || request !== latestSnapshotRequest) return;
    if (
      snapshot.origin === latestOrigin &&
      snapshot.revision < latestRevision
    ) {
      return;
    }

    latestOrigin = snapshot.origin;
    latestRevision = snapshot.revision;
    applyRemoteSnapshot(snapshot.state);
  };

  const enqueuePersist = (
    previousState: Partial<State>,
    state: Partial<State>,
    changedKeys: FieldName<State>[]
  ) => {
    if (!changedKeys.length || destroyed) return;
    const partials = changedKeys.reduce<Partial<State>>((result, key) => {
      result[key] = state[key];
      return result;
    }, {});
    writeQueue = writeQueue
      .then(() =>
        options.storage.set({ changedKeys, partials, previousState, state })
      )
      .catch(async (error) => {
        // Held for `flush()` to surface. The queue itself stays resolved so a
        // single failed write does not poison every write after it.
        pendingWriteError = { error };
        reportError(error);
        try {
          await restoreBackgroundSnapshot();
        } catch (restoreError) {
          reportError(restoreError);
        }
      });
  };

  const trackLocalChanges = (before: State, after: State) => {
    if (applyingRemote) return;
    const previousState = partialize(before);
    const state = partialize(after);
    const changedKeys = Object.keys({ ...previousState, ...state }).filter(
      (key) =>
        !Object.is(
          previousState[key as FieldName<State>],
          state[key as FieldName<State>]
        )
    ) as FieldName<State>[];
    enqueuePersist(previousState, state, changedKeys);
  };

  const applyLocalSet = ((...args: PendingSet<State>) => {
    if (!hydrated) {
      pendingLocalUpdates.push(args);
      return;
    }
    const before = store.getState();
    callSet(rawSet, args);
    trackLocalChanges(before, store.getState());
  }) as SetState<State>;

  const store = create<State>()(
    subscribeWithSelector(
      (
        set: SetState<State>,
        get: StoreApi<State>['getState'],
        api: StoreApi<State>
      ) => {
        rawSet = set;
        return initializer(applyLocalSet, get, api);
      }
    )
  ) as RabbyStore<State>;

  store.setState = applyLocalSet;

  const applyRemoteState = (state: Partial<State>) => {
    if (destroyed) return;
    applyingRemote = true;
    try {
      rawSet(state);
    } finally {
      applyingRemote = false;
    }
  };

  const applySyncedUpdate = (update: BackgroundStoreUpdate<State>) => {
    if (destroyed) return;
    if (!hydrated) {
      pendingSyncedUpdates.push(update);
      return;
    }
    if (update.origin !== latestOrigin) {
      void restoreBackgroundSnapshot().catch(reportError);
      return;
    }
    if (update.revision <= latestRevision) return;

    latestRevision = update.revision;
    applyRemoteState(update.state);
  };

  const hydrate = async () => {
    try {
      const snapshot = await options.storage.get();
      const persistedState = snapshot.state;
      applyRemoteSnapshot(persistedState);

      latestOrigin = snapshot.origin;
      latestRevision = snapshot.revision;
      hydrated = true;
      pendingSyncedUpdates.splice(0).forEach(applySyncedUpdate);
      pendingLocalUpdates
        .splice(0)
        .forEach((args) => callSet(applyLocalSet, args));
    } catch (error) {
      hydrated = true;
      pendingLocalUpdates
        .splice(0)
        .forEach((args) => callSet(applyLocalSet, args));
      reportError(error);
      throw error;
    }
  };

  let hydration: Promise<void> | undefined;
  const startHydration = () => {
    // A rejected hydration must not be memoized. The background port rejects
    // in-flight requests when the service worker is evicted, so a failure here
    // is usually transient and `persist.hydrate()` has to stay retryable.
    hydration ||= hydrate().catch((error) => {
      hydration = undefined;
      throw error;
    });
    return hydration;
  };
  const disposeRemoteSubscription = options.sync?.engine.subscribe(
    applySyncedUpdate
  );
  const disposeReconnectSubscription = options.sync?.engine.onReconnect?.(
    () => {
      if (!hydrated || destroyed) return;
      void restoreBackgroundSnapshot().catch(reportError);
    }
  );

  store.persist = {
    destroy() {
      destroyed = true;
      disposeRemoteSubscription?.();
      disposeReconnectSubscription?.();
    },
    // Rejects when a queued write failed, so callers that await a save can
    // tell the user instead of reporting a success the background rejected.
    flush: async () => {
      await writeQueue;
      if (!pendingWriteError) return;
      const { error } = pendingWriteError;
      pendingWriteError = undefined;
      throw error;
    },
    hasHydrated: () => hydrated,
    hydrate: startHydration,
    hydrationPromise: startHydration,
  };

  if (options.autoHydrate !== false) {
    // Already reported through `onError`; swallow so an evicted service worker
    // doesn't surface as an unhandled rejection.
    void startHydration().catch(() => undefined);
  }

  return store;
};
