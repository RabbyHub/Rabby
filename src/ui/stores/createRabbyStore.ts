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
  let latestRevision = -1;
  let rawSet!: SetState<State>;
  let writeQueue = Promise.resolve();
  const pendingLocalUpdates: PendingSet<State>[] = [];
  const pendingSyncedUpdates: BackgroundStoreUpdate<State>[] = [];

  const reportError = (error: unknown) => {
    options.onError?.(error);
  };

  const restoreBackgroundSnapshot = async () => {
    const snapshot = await options.storage.get();
    if (snapshot.revision < latestRevision) return;

    latestRevision = snapshot.revision;
    applyRemoteState(snapshot.state);
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
    if (destroyed || update.revision <= latestRevision) return;
    if (!hydrated) {
      pendingSyncedUpdates.push(update);
      return;
    }
    latestRevision = update.revision;
    applyRemoteState(update.state);
  };

  const hydrate = async () => {
    try {
      const snapshot = await options.storage.get();
      const persistedState = snapshot.state;
      const currentState = store.getState();
      const mergedState = options.merge
        ? options.merge(persistedState, currentState)
        : ({ ...currentState, ...persistedState } as State);

      applyingRemote = true;
      try {
        rawSet(mergedState, true);
      } finally {
        applyingRemote = false;
      }

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
    hydration ||= hydrate();
    return hydration;
  };
  const disposeRemoteSubscription = options.sync?.engine.subscribe(
    applySyncedUpdate
  );

  store.persist = {
    destroy() {
      destroyed = true;
      disposeRemoteSubscription?.();
    },
    flush: () => writeQueue,
    hasHydrated: () => hydrated,
    hydrate: startHydration,
    hydrationPromise: startHydration,
  };

  if (options.autoHydrate !== false) {
    void startHydration();
  }

  return store;
};
