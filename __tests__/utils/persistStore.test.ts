import {
  default as createPersistStore,
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
        partials: { count: 1, optional: 'value' },
      })
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
