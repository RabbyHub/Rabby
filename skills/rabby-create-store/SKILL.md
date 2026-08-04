---
name: rabby-create-store
description: Create or migrate Rabby UI state stores with Zustand createRabbyStore, including wallet-backed background persistence, partial synchronization, revision handling, Zod-validated service schemas, hydration, rollback, and tests. Use when adding a persisted Rabby UI store, migrating a Rematch model to Zustand, syncing UI state with a background service, or extending the persisted-store infrastructure beyond Swap.
---

# Create Rabby Store

Create persisted UI stores with the background service as the source of truth. Preserve existing service APIs and migrate only the requested domain.

## Inspect the Existing Domain

1. Read these infrastructure files before changing code:
   - `src/ui/stores/createRabbyStore.ts`
   - `src/ui/stores/createExtensionStoreOptions.ts`
   - `src/ui/stores/createSyncedBackgroundStorage.ts`
   - `src/types/persistedStore.ts`
   - `src/background/controller/wallet.ts`
   - `src/background/utils/persistStore.ts`
2. Read `src/ui/stores/swap.ts` and `src/background/service/swap.ts` as the reference implementation.
3. Locate the current Rematch model, all UI call sites, initialization order, background service fields, and legacy controller methods for the requested domain.
4. Check the worktree and preserve unrelated user changes.
5. Use `rg` to find consumers before renaming, deleting, or changing a public API.

## Decide State Ownership

- Put durable user preferences and business state in the background service schema.
- Keep actions, loading flags, errors, open/closed UI state, request results, and derived UI-only values out of persistence unless the task explicitly requires them.
- Use `partialize` to exclude every non-persisted field and all functions from UI writes.
- Use `merge` to rebuild derived or UI-only state from the hydrated background snapshot when necessary.
- Use plain Zustand or component state instead of `createRabbyStore` when the entire store is transient and needs no background persistence or cross-window synchronization.
- Never access `chrome.storage` directly from the UI store. Keep the path `UI -> wallet -> background controller -> service store`.

## Implement the Background Source of Truth

Define the persisted shape once with Zod in the domain service:

```ts
const featureStoreSchema = z.object({
  enabled: z.boolean().default(false),
  selectedItem: itemSchema.optional(),
});

export type FeatureServiceStore = z.output<typeof featureStoreSchema>;

const createFeatureStoreTemplate = (): FeatureServiceStore =>
  featureStoreSchema.parse({});
```

Then initialize and patch the service through the shared persistence helpers:

```ts
this.store = await createPersistStore({
  name: 'feature',
  template: createFeatureStoreTemplate(),
  schema: featureStoreSchema,
});

patchStore(partials: Partial<FeatureServiceStore>) {
  patchPersistStore(this.store, partials);
}
```

Follow these rules:

- Give every required persisted field a schema default.
- Keep persisted values JSON-serializable.
- Avoid asynchronous refinements and transforms to `Date`, `Map`, class instances, or other Chrome Storage-incompatible values.
- Treat the Zod object as the authoritative persisted keys, defaults, validation, and output type. Do not maintain a duplicate field whitelist.
- Route generic UI writes through the service `patchStore` method so the merged full state is validated atomically before commit.
- Preserve domain-specific service methods and controller methods still used by existing callers.

## Register the Generic Background Bridge

1. Add the service store type to `PersistedStoreMap` in `src/types/persistedStore.ts`.
2. Add the new key to the routing in `src/background/controller/wallet.ts` for snapshot reads and partial writes.
3. Delegate writes to the domain service's `patchStore(partials)` method. Do not assign an incoming full UI state directly to the service store.
4. Return the service snapshot with its current revision so the UI can reject stale updates.
5. Keep the generic API shaped like storage: `getStorageSnapshot(key)` and `setStorageItem(key, partials)`.

## Implement the UI Store

Build the domain store with `createRabbyStore` and `createExtensionStoreOptions`:

```ts
type FeatureState = FeatureServiceStore & {
  transientResult: Result | null;
};

type FeatureActions = {
  setEnabled: (enabled: boolean) => void;
};

export type FeatureStore = FeatureState & FeatureActions;

export const useFeatureStore = createRabbyStore<FeatureStore>(
  (set) => ({
    enabled: false,
    selectedItem: undefined,
    transientResult: null,
    setEnabled(enabled) {
      set({ enabled });
    },
  }),
  createExtensionStoreOptions<FeatureStore, 'feature'>({
    storageKey: 'feature',
    autoHydrate: false,
    partialize(state) {
      const persistedState: Partial<FeatureStore> = {};
      Object.entries(state).forEach(([key, value]) => {
        if (key !== 'transientResult' && typeof value !== 'function') {
          (persistedState as Record<string, unknown>)[key] = value;
        }
      });
      return persistedState;
    },
    onError(error) {
      console.error('[featureStore]', error);
    },
  })
);
```

- Call `set()` for normal user actions. It performs the optimistic UI update and queues a partial background write after hydration.
- Do not call `wallet.setStorageItem` manually from ordinary setters; the storage adapter owns persistence.
- Use `useFeatureStore.persist.applyRemote(partials)` only for authoritative values fetched outside the normal sync channel. It must not write the value back to the background.
- Use `autoHydrate: false` when startup depends on another initialization step, then expose an initializer that awaits `useFeatureStore.persist.hydrate()`.
- Otherwise allow automatic hydration.
- Update UI consumers and remove the requested domain's Rematch bindings only after the Zustand replacement covers their behavior.

## Preserve Synchronization Invariants

- Send only fields changed by the local UI action.
- Validate `current background state + partials` before committing any field.
- Make one accepted background patch produce one persistence write, one revision increment, and one broadcast.
- Include only the changed partials and new revision in broadcasts.
- Ignore remote updates whose revision is not newer than the UI's latest revision.
- Apply remote updates without triggering another persistence write.
- Serialize UI writes so rapid local updates keep their order.
- On persistence failure, report the error and restore the authoritative background snapshot.
- Preserve unrelated fields when different windows update different fields.
- Treat concurrent writes to the same field as last-background-arrival-wins. Revisions prevent stale delivery; they do not provide CRDT-style conflict resolution.

## Test the Migration

Add or update focused tests alongside the existing store tests. Cover the behaviors relevant to the domain:

- manual and automatic hydration;
- updates queued before hydration;
- optimistic local updates and serialized partial persistence;
- remote updates without writeback loops;
- stale revision rejection;
- rollback after a rejected persistence request;
- Zod defaults and transformations;
- atomic rejection of invalid patches;
- stripping unknown fields;
- one revision and broadcast per accepted patch;
- two UI contexts receiving a background change.

Run the targeted tests first, then run `yarn check`. If the user asks for a commit, also load and follow `skills/rabby-yarn-v4-commit-check/SKILL.md` before committing.

## Guardrails

- Migrate only the requested domain; do not convert unrelated Rematch models opportunistically.
- Do not persist action functions, request caches, or UI-only state.
- Do not make the UI send full snapshots for a single-field edit.
- Do not duplicate schema keys in controller or service routing code.
- Do not replace existing service APIs merely to fit the new store abstraction.
- Do not claim partial patches eliminate same-field races.
