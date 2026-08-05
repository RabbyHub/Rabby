import { createRabbyStore } from '@/ui/stores/createRabbyStore';
import {
  BackgroundStoreSnapshot,
  createSyncedBackgroundStorage,
} from '@/ui/stores/createSyncedBackgroundStorage';

type TestStore = {
  count: number;
  label: string;
  setCount: (count: number) => void;
  setLabel: (label: string) => void;
};

const createDeferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

describe('createRabbyStore', () => {
  test('supports manually starting hydration after dependencies are injected', async () => {
    const get = jest.fn().mockResolvedValue({
      revision: 0,
      state: { count: 3 },
    });
    const { storage } = createSyncedBackgroundStorage<TestStore>({
      get,
      set: async () => undefined,
      subscribe: () => () => undefined,
    });
    const store = createRabbyStore<TestStore>(
      (set) => ({
        count: 0,
        label: 'initial',
        setCount: (count) => set({ count }),
        setLabel: (label) => set({ label }),
      }),
      { autoHydrate: false, storage }
    );

    expect(get).not.toHaveBeenCalled();
    await store.persist.hydrate();
    expect(get).toHaveBeenCalledTimes(1);
    expect(store.getState().count).toBe(3);
    store.persist.destroy();
  });

  test('hydrates and replays local updates made while hydration is pending', async () => {
    const hydration = createDeferred<BackgroundStoreSnapshot<TestStore>>();
    const persist = jest.fn().mockResolvedValue(undefined);
    const { storage } = createSyncedBackgroundStorage<TestStore>({
      get: () => hydration.promise,
      set: persist,
      subscribe: () => () => undefined,
    });
    const store = createRabbyStore<TestStore>(
      (set) => ({
        count: 0,
        label: 'initial',
        setCount: (count) => set({ count }),
        setLabel: (label) => set({ label }),
      }),
      {
        storage,
      }
    );

    store.getState().setCount(7);
    expect(store.getState().count).toBe(0);

    hydration.resolve({
      revision: 0,
      state: { count: 5, label: 'persisted' },
    });
    await store.persist.hydrationPromise();
    await store.persist.flush();

    expect(store.getState()).toMatchObject({ count: 7, label: 'persisted' });
    expect(persist).toHaveBeenCalledWith(
      expect.objectContaining({ changedKeys: ['count'] })
    );
    expect(persist).toHaveBeenCalledWith(
      expect.objectContaining({ partials: { count: 7 } })
    );
    store.persist.destroy();
  });

  test('updates optimistically and serializes background persistence', async () => {
    const calls: number[] = [];
    const { storage } = createSyncedBackgroundStorage<TestStore>({
      get: async () => ({ revision: 0, state: {} }),
      set: async ({ partials }) => {
        calls.push(partials.count!);
      },
      subscribe: () => () => undefined,
    });
    const store = createRabbyStore<TestStore>(
      (set) => ({
        count: 0,
        label: 'initial',
        setCount: (count) => set({ count }),
        setLabel: (label) => set({ label }),
      }),
      {
        storage,
      }
    );
    await store.persist.hydrationPromise();

    store.getState().setCount(1);
    expect(store.getState().count).toBe(1);
    store.getState().setCount(2);
    expect(store.getState().count).toBe(2);

    await store.persist.flush();
    expect(calls).toEqual([1, 2]);
    store.persist.destroy();
  });

  test('applies background updates without persisting them back', async () => {
    let onRemote!: (update: BackgroundStoreSnapshot<TestStore>) => void;
    const persist = jest.fn().mockResolvedValue(undefined);
    const dispose = jest.fn();
    const { storage, syncEngine } = createSyncedBackgroundStorage<TestStore>({
      get: async () => ({ revision: 0, state: {} }),
      set: persist,
      subscribe(listener) {
        onRemote = listener;
        return dispose;
      },
    });
    const store = createRabbyStore<TestStore>(
      (set) => ({
        count: 0,
        label: 'initial',
        setCount: (count) => set({ count }),
        setLabel: (label) => set({ label }),
      }),
      {
        storage,
        sync: { engine: syncEngine },
      }
    );
    await store.persist.hydrationPromise();

    onRemote({ revision: 1, state: { count: 9 } });
    await store.persist.flush();

    expect(store.getState().count).toBe(9);
    expect(persist).not.toHaveBeenCalled();
    store.persist.destroy();
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  test('ignores background updates older than the latest revision', async () => {
    let onRemote!: (update: BackgroundStoreSnapshot<TestStore>) => void;
    const { storage, syncEngine } = createSyncedBackgroundStorage<TestStore>({
      get: async () => ({ revision: 3, state: { count: 3 } }),
      set: async () => undefined,
      subscribe(listener) {
        onRemote = listener;
        return () => undefined;
      },
    });
    const store = createRabbyStore<TestStore>(
      (set) => ({
        count: 0,
        label: 'initial',
        setCount: (count) => set({ count }),
        setLabel: (label) => set({ label }),
      }),
      { storage, sync: { engine: syncEngine } }
    );
    await store.persist.hydrationPromise();

    onRemote({ revision: 5, state: { count: 5 } });
    onRemote({ revision: 4, state: { count: 4 } });

    expect(store.getState().count).toBe(5);
    store.persist.destroy();
  });

  test('restores the background snapshot when persistence rejects', async () => {
    const onError = jest.fn();
    const get = jest
      .fn()
      .mockResolvedValueOnce({ revision: 0, state: { count: 0 } })
      .mockResolvedValueOnce({ revision: 0, state: { count: 0 } });
    const { storage } = createSyncedBackgroundStorage<TestStore>({
      get,
      set: async () => {
        throw new Error('invalid patch');
      },
      subscribe: () => () => undefined,
    });
    const store = createRabbyStore<TestStore>(
      (set) => ({
        count: 0,
        label: 'initial',
        setCount: (count) => set({ count }),
        setLabel: (label) => set({ label }),
      }),
      { storage, onError }
    );
    await store.persist.hydrationPromise();

    store.getState().setCount(2);
    expect(store.getState().count).toBe(2);
    await store.persist.flush();

    expect(store.getState().count).toBe(0);
    expect(get).toHaveBeenCalledTimes(2);
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
    store.persist.destroy();
  });
});
