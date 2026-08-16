import {
  default as createPersistStore,
  getPersistStoreOrigin,
  patchPersistStore,
  PersistStoreSchemaValidationError,
} from '@/background/utils/persistStore';
import { storage } from '@/background/webapi';
import { syncStateToUI } from '@/background/utils/broadcastToUI';
import { z } from 'zod';

jest.mock('@/background/webapi', () => ({
  storage: {
    get: jest.fn(),
    set: jest.fn(),
  },
}));

jest.mock('@/background/utils/broadcastToUI', () => ({
  syncStateToUI: jest.fn(),
}));

const testStoreSchema = z.object({
  count: z.number(),
  optional: z.string().trim().optional(),
});

type TestStore = z.output<typeof testStoreSchema>;

describe('patchPersistStore', () => {
  test('validates the merged state and only applies requested fields', async () => {
    const storageGet = storage.get as jest.Mock;
    storageGet.mockResolvedValue(undefined);
    const store = await createPersistStore<TestStore>({
      name: 'test-persist-store',
      template: {
        count: 0,
        optional: undefined,
      },
      schema: testStoreSchema,
    });

    patchPersistStore(store, {
      count: 1,
      optional: ' value ',
      unknown: true,
    } as Partial<TestStore>);
    patchPersistStore(store, { count: 1 });

    expect(store).toMatchObject({ count: 1, optional: 'value' });
    expect(Object.prototype.hasOwnProperty.call(store, 'unknown')).toBe(false);
    expect(syncStateToUI).toHaveBeenCalledTimes(1);
    expect(syncStateToUI).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        changedKeys: ['count', 'optional'],
        origin: getPersistStoreOrigin(),
        partials: { count: 1, optional: 'value' },
      })
    );
  });

  test('drops legacy fields the schema rejects so later writes still apply', async () => {
    const storageGet = storage.get as jest.Mock;
    const storageSet = storage.set as jest.Mock;
    // `null` is what Chrome's JSON port serialization used to persist when the
    // old controller setters were called with `undefined`.
    storageGet.mockResolvedValue({ count: 3, optional: null });
    storageSet.mockClear();

    const store = await createPersistStore<TestStore>({
      name: 'test-legacy-persist-store',
      template: { count: 0, optional: undefined },
      schema: testStoreSchema,
    });

    // The valid field survives; only the offending one is dropped.
    expect(store.count).toBe(3);
    expect(store.optional).toBeUndefined();
    // The repaired state is written back so the store isn't re-broken on boot.
    expect(storageSet).toHaveBeenCalledWith(
      'test-legacy-persist-store',
      expect.objectContaining({ count: 3 })
    );

    expect(() => patchPersistStore(store, { count: 4 })).not.toThrow();
    expect(store.count).toBe(4);
  });

  test('keeps unknown keys when repairing', async () => {
    const storageGet = storage.get as jest.Mock;
    storageGet.mockResolvedValue({
      count: 1,
      optional: null,
      deprecated: 'keep me',
    });

    const store = await createPersistStore<TestStore>({
      name: 'test-unknown-keys-persist-store',
      template: { count: 0, optional: undefined },
      schema: testStoreSchema,
    });

    // The repair ran (the bad field is gone) but did not strip unknown keys,
    // so downgrading to an older build doesn't lose them.
    expect(store.optional).toBeUndefined();
    expect(() => patchPersistStore(store, { count: 2 })).not.toThrow();
    expect((store as any).deprecated).toBe('keep me');
  });

  test('falls back to schema defaults when no field can be blamed', async () => {
    const storageGet = storage.get as jest.Mock;
    storageGet.mockResolvedValue({ count: 5 });

    const store = await createPersistStore({
      name: 'test-unrepairable-persist-store',
      template: { count: 0 },
      // An object-level refinement reports an issue with an empty path, so
      // there is no single field to drop.
      schema: z
        .object({ count: z.number().default(7) })
        .refine((value) => value.count !== 5, 'count must not be 5'),
    });

    expect(store.count).toBe(7);
  });

  // Mirrors the real swap store shape (src/background/service/swap.ts). The
  // service itself can't be imported here — it pulls in the whole background
  // service graph — so the schema is reproduced instead.
  test('repairs the legacy null tokens that the swap store carries', async () => {
    const isRecord = (value: unknown): value is Record<string, unknown> =>
      !!value && typeof value === 'object' && !Array.isArray(value);
    const isTokenItem = (value: unknown) =>
      isRecord(value) &&
      typeof value.id === 'string' &&
      typeof value.chain === 'string';
    const tokenItemSchema = z.custom(isTokenItem);
    const swapLikeSchema = z.object({
      selectedChain: z.string().nullable().default(null),
      selectedFromToken: tokenItemSchema.optional(),
      selectedToToken: tokenItemSchema.optional(),
      slippage: z.string().default('0.1'),
      autoSlippage: z.boolean().default(true),
    });

    const storageGet = storage.get as jest.Mock;
    // What the old controller setters persisted: Chrome serializes
    // `params: [undefined]` as `[null]`, so the background wrote `null`.
    storageGet.mockResolvedValue({
      selectedChain: null,
      selectedFromToken: null,
      selectedToToken: null,
      slippage: '0.5',
      autoSlippage: false,
    });

    const store = await createPersistStore({
      name: 'test-swap-like-store',
      template: swapLikeSchema.parse({}),
      schema: swapLikeSchema,
    });

    expect(store.selectedFromToken).toBeUndefined();
    expect(store.selectedToToken).toBeUndefined();
    // Untouched valid fields keep the user's values.
    expect(store.slippage).toBe('0.5');
    expect(store.autoSlippage).toBe(false);

    // Before the fix every one of these threw and the UI rolled back.
    const ethToken = { id: 'eth', chain: 'eth' };
    expect(() =>
      patchPersistStore(store, { selectedFromToken: ethToken })
    ).not.toThrow();
    expect(() => patchPersistStore(store, { slippage: '1' })).not.toThrow();
    expect(() =>
      patchPersistStore(store, { selectedChain: 'HYPER' })
    ).not.toThrow();
    expect(store.selectedFromToken).toEqual(ethToken);
    expect(store.slippage).toBe('1');
    expect(store.selectedChain).toBe('HYPER');
  });

  test('clears a field when a patch sets it to undefined', async () => {
    const storageGet = storage.get as jest.Mock;
    storageGet.mockResolvedValue({ count: 1, optional: 'value' });
    (syncStateToUI as jest.Mock).mockClear();

    const store = await createPersistStore<TestStore>({
      name: 'test-clear-persist-store',
      template: { count: 0, optional: undefined },
      schema: testStoreSchema,
    });
    expect(store.optional).toBe('value');

    patchPersistStore(store, { optional: undefined });

    expect(store.optional).toBeUndefined();
    // `changedKeys` is what lets the UI rebuild the cleared field after the
    // JSON port transport drops the `undefined` value.
    expect(syncStateToUI).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ changedKeys: ['optional'] })
    );
  });

  test('rejects invalid patches before changing the store', async () => {
    const storageGet = storage.get as jest.Mock;
    storageGet.mockResolvedValue(undefined);
    const store = await createPersistStore<TestStore>({
      name: 'test-invalid-persist-store',
      template: { count: 0, optional: undefined },
      schema: testStoreSchema,
    });

    expect(() => patchPersistStore(store, { count: 'invalid' } as any)).toThrow(
      PersistStoreSchemaValidationError
    );
    expect(store.count).toBe(0);
  });
});
