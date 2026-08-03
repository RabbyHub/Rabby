import { createBaseStore } from '@/ui/stores/createBaseStore';
import { createSyncedBackgroundStorage } from '@/ui/stores/createSyncedBackgroundStorage';

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

describe('createBaseStore', () => {
  test('supports manually starting hydration after dependencies are injected', async () => {
    const get = jest.fn().mockResolvedValue({ count: 3 });
    const { storage } = createSyncedBackgroundStorage<TestStore>({
      get,
      set: async () => undefined,
      subscribe: () => () => undefined,
    });
    const store = createBaseStore<TestStore>(
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
    const hydration = createDeferred<Partial<TestStore>>();
    const persist = jest.fn().mockResolvedValue(undefined);
    const { storage } = createSyncedBackgroundStorage<TestStore>({
      get: () => hydration.promise,
      set: persist,
      subscribe: () => () => undefined,
    });
    const store = createBaseStore<TestStore>(
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

    hydration.resolve({ count: 5, label: 'persisted' });
    await store.persist.hydrationPromise();
    await store.persist.flush();

    expect(store.getState()).toMatchObject({ count: 7, label: 'persisted' });
    expect(persist).toHaveBeenCalledWith(
      expect.objectContaining({ changedKeys: ['count'] })
    );
    store.persist.destroy();
  });

  test('updates optimistically and serializes background persistence', async () => {
    const calls: number[] = [];
    const { storage } = createSyncedBackgroundStorage<TestStore>({
      get: async () => ({}),
      set: async ({ state }) => {
        calls.push(state.count!);
      },
      subscribe: () => () => undefined,
    });
    const store = createBaseStore<TestStore>(
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
    let onRemote!: (state: Partial<TestStore>) => void;
    const persist = jest.fn().mockResolvedValue(undefined);
    const dispose = jest.fn();
    const { storage, syncEngine } = createSyncedBackgroundStorage<TestStore>({
      get: async () => ({}),
      set: persist,
      subscribe(listener) {
        onRemote = listener;
        return dispose;
      },
    });
    const store = createBaseStore<TestStore>(
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

    onRemote({ count: 9 });
    await store.persist.flush();

    expect(store.getState().count).toBe(9);
    expect(persist).not.toHaveBeenCalled();
    store.persist.destroy();
    expect(dispose).toHaveBeenCalledTimes(1);
  });
});
