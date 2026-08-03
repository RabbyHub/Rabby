import { StateCreator, StoreApi, UseBoundStore, create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import {
  BackgroundStoreStorage,
  BackgroundStoreSyncEngine,
} from './createSyncedBackgroundStorage';

type SetState<State> = StoreApi<State>['setState'];
type PendingSet<State> = Parameters<SetState<State>>;
type FieldName<State> = Extract<keyof State, string>;

export type BaseStoreOptions<State extends Record<string, unknown>> = {
  autoHydrate?: boolean;
  storage: BackgroundStoreStorage<State>;
  sync?: {
    engine: BackgroundStoreSyncEngine<State>;
  };
  partialize?: (state: State) => Partial<State>;
  merge?: (persistedState: Partial<State>, currentState: State) => State;
  onError?: (error: unknown) => void;
};

export type BaseStoreControls<State> = {
  applyRemote: (state: Partial<State>) => void;
  destroy: () => void;
  flush: () => Promise<void>;
  hasHydrated: () => boolean;
  hydrate: () => Promise<void>;
  hydrationPromise: () => Promise<void>;
};

export type BaseStore<State extends Record<string, unknown>> = UseBoundStore<
  StoreApi<State>
> & {
  persist: BaseStoreControls<State>;
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
export const createBaseStore = <State extends Record<string, unknown>>(
  initializer: StateCreator<
    State,
    [['zustand/subscribeWithSelector', never]],
    []
  >,
  options: BaseStoreOptions<State>
): BaseStore<State> => {
  const partialize =
    options.partialize || ((state: State) => defaultPartialize(state));
  let hydrated = false;
  let destroyed = false;
  let applyingRemote = false;
  let rawSet!: SetState<State>;
  let writeQueue = Promise.resolve();
  const pendingLocalUpdates: PendingSet<State>[] = [];
  const pendingRemoteUpdates: Partial<State>[] = [];

  const reportError = (error: unknown) => {
    options.onError?.(error);
  };

  const enqueuePersist = (
    previousState: Partial<State>,
    state: Partial<State>,
    changedKeys: FieldName<State>[]
  ) => {
    if (!changedKeys.length || destroyed) return;
    writeQueue = writeQueue
      .then(() => options.storage.set({ changedKeys, previousState, state }))
      .catch(reportError);
  };

  const trackLocalChanges = (before: State, after: State) => {
    if (applyingRemote) return;
    const previousState = partialize(before);
    const state = partialize(after);
    const changedKeys = Object.keys(state).filter(
      (key) =>
        !Object.is(
          previousState[key as FieldName<State>],
          state[key as FieldName<State>]
        )
    ) as FieldName<State>[];
    enqueuePersist(previousState, state, changedKeys);
  };

  const applyLocalSet: SetState<State> = (...args: PendingSet<State>) => {
    if (!hydrated) {
      pendingLocalUpdates.push(args);
      return;
    }
    const before = store.getState();
    rawSet(...args);
    trackLocalChanges(before, store.getState());
  };

  const store = create<State>()(
    subscribeWithSelector((set, get, api) => {
      rawSet = set;
      return initializer(applyLocalSet, get, api);
    })
  ) as BaseStore<State>;

  store.setState = applyLocalSet;

  const applyRemote = (state: Partial<State>) => {
    if (destroyed) return;
    if (!hydrated) {
      pendingRemoteUpdates.push(state);
      return;
    }
    applyingRemote = true;
    try {
      rawSet(state);
    } finally {
      applyingRemote = false;
    }
  };

  const hydrate = async () => {
    try {
      const persistedState = await options.storage.get();
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

      hydrated = true;
      pendingLocalUpdates.splice(0).forEach((args) => applyLocalSet(...args));
      pendingRemoteUpdates.splice(0).forEach(applyRemote);
    } catch (error) {
      hydrated = true;
      pendingLocalUpdates.splice(0).forEach((args) => applyLocalSet(...args));
      reportError(error);
      throw error;
    }
  };

  let hydration: Promise<void> | undefined;
  const startHydration = () => {
    hydration ||= hydrate();
    return hydration;
  };
  const disposeRemoteSubscription = options.sync?.engine.subscribe(applyRemote);

  store.persist = {
    applyRemote,
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
