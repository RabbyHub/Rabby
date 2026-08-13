/* eslint-disable @typescript-eslint/ban-types */
import { storage } from 'background/webapi';
import { syncStateToUI } from './broadcastToUI';
import { BROADCAST_TO_UI_EVENTS } from '@/utils/broadcastToUI';
import { isEqual } from 'lodash';
import { nanoid } from 'nanoid';

const persistStorage = (name: string, obj: object) => {
  storage.set(name, obj);
};

const storeRevisions = new Map<string, number>();
const persistStoreOrigin = nanoid();

export type PersistStoreSchemaIssue = {
  message: string;
  path?: ReadonlyArray<PropertyKey | { key: PropertyKey }>;
};

type PersistStoreSchemaResult<T> =
  | { value: T; issues?: undefined }
  | { issues: ReadonlyArray<PersistStoreSchemaIssue> };

/**
 * The subset of Standard Schema v1 used by persisted background stores.
 * Zod, Valibot and other Standard Schema-compatible validators can be passed
 * directly without an adapter.
 */
export type PersistStoreSchema<T> = {
  readonly '~standard': {
    readonly version: 1;
    readonly vendor: string;
    readonly validate: (
      value: unknown
    ) => PersistStoreSchemaResult<T> | Promise<PersistStoreSchemaResult<T>>;
  };
};

type PersistStoreMetadata<T extends object> = {
  applyPatch: (partials: Partial<T>) => void;
  schema?: PersistStoreSchema<T>;
};

const persistStoreMetadata = new WeakMap<object, PersistStoreMetadata<any>>();

export class PersistStoreSchemaValidationError extends Error {
  constructor(readonly issues: ReadonlyArray<PersistStoreSchemaIssue>) {
    super(
      `Persisted store validation failed: ${issues
        .map((issue) => issue.message)
        .join(', ')}`
    );
    this.name = 'PersistStoreSchemaValidationError';
  }
}

const runSchemaValidation = <T extends object>(
  schema: PersistStoreSchema<T>,
  state: unknown
) => {
  const result = schema['~standard'].validate(state);
  if (result instanceof Promise) {
    throw new Error('Persisted store schema must be synchronous');
  }
  return result;
};

const validatePersistStoreState = <T extends object>(
  schema: PersistStoreSchema<T>,
  state: unknown
) => {
  const result = runSchemaValidation(schema, state);
  if ('issues' in result && result.issues) {
    throw new PersistStoreSchemaValidationError(result.issues);
  }
  return result.value;
};

const MAX_SANITIZE_PASSES = 10;

const getIssueTopLevelKey = (issue: PersistStoreSchemaIssue) => {
  const segment = issue.path?.[0];
  if (segment === null || segment === undefined) return undefined;
  if (typeof segment === 'object' && 'key' in segment) return segment.key;
  return segment;
};

/**
 * Repairs persisted state written before the current schema existed.
 *
 * `patchPersistStore` validates the whole merged state on every write, so one
 * legacy field the schema rejects would make every later write throw — and the
 * UI store silently rolls the change back. Drop only the offending top-level
 * keys so the schema's own defaults fill them back in, and keep unknown keys
 * so downgrading to an older build doesn't lose them.
 */
const sanitizePersistStoreState = <T extends object>(
  schema: PersistStoreSchema<T>,
  state: T
): { state: T; repaired: boolean } => {
  const candidate = { ...state } as Record<PropertyKey, unknown>;
  const droppedKeys = new Set<PropertyKey>();

  for (let pass = 0; pass < MAX_SANITIZE_PASSES; pass++) {
    const result = runSchemaValidation(schema, candidate);

    if (!('issues' in result) || !result.issues) {
      if (!droppedKeys.size) return { state, repaired: false };

      const sanitized = { ...state } as Record<PropertyKey, unknown>;
      droppedKeys.forEach((key) => delete sanitized[key]);
      Object.assign(sanitized, result.value);
      return { state: (sanitized as unknown) as T, repaired: true };
    }

    const invalidKeys = result.issues
      .map(getIssueTopLevelKey)
      .filter(
        (key): key is PropertyKey =>
          key !== undefined &&
          Object.prototype.hasOwnProperty.call(candidate, key)
      );
    if (!invalidKeys.length) break;

    invalidKeys.forEach((key) => {
      delete candidate[key];
      droppedKeys.add(key);
    });
  }

  // Nothing could be attributed to a specific field, so fall back to the
  // schema's defaults rather than leaving a store that rejects every write.
  try {
    return { state: validatePersistStoreState(schema, {}), repaired: true };
  } catch {
    return { state, repaired: false };
  }
};

const nextPersistStoreRevision = (name: string) => {
  const revision = (storeRevisions.get(name) || 0) + 1;
  storeRevisions.set(name, revision);
  return revision;
};

export const getPersistStoreRevision = (name: string) =>
  storeRevisions.get(name) || 0;

export const getPersistStoreOrigin = () => persistStoreOrigin;

export const patchPersistStore = <T extends object>(
  store: T,
  partials: Partial<T>
) => {
  const metadata = persistStoreMetadata.get(store) as
    | PersistStoreMetadata<T>
    | undefined;
  if (!metadata) {
    throw new Error('Store was not created by createPersistStore');
  }
  if (!metadata.schema) {
    throw new Error('Persisted store does not have a schema');
  }

  const validatedState = validatePersistStoreState(metadata.schema, {
    ...store,
    ...partials,
  });

  const validatedPartials: Partial<T> = {};
  Object.keys(partials).forEach((key) => {
    const storeKey = key as keyof T;
    if (
      Object.prototype.hasOwnProperty.call(validatedState, storeKey) &&
      !isEqual(store[storeKey], validatedState[storeKey])
    ) {
      validatedPartials[storeKey] = validatedState[storeKey];
    }
  });
  metadata.applyPatch(validatedPartials);
};

interface CreatePersistStoreParams<T> {
  name: string;
  template?: T;
  fromStorage?: boolean;
  schema?: PersistStoreSchema<T>;
}

const createPersistStore = async <T extends object>({
  name,
  template = Object.create(null),
  fromStorage = true,
  schema,
}: CreatePersistStoreParams<T>): Promise<T> => {
  let tpl = template;

  if (fromStorage) {
    const storageCache = await storage.get(name);
    tpl = Object.assign({}, template, storageCache);
    // tpl = storageCache || template;
    if (!storageCache) {
      await storage.set(name, tpl);
    }
  }

  if (schema) {
    const sanitized = sanitizePersistStoreState(schema, tpl);
    if (sanitized.repaired) {
      tpl = sanitized.state;
      if (fromStorage) {
        await storage.set(name, tpl);
      }
    }
  }

  const commitPartials = (target: T, partials: Partial<T>) => {
    const changedKeys = Object.keys(partials);
    if (!changedKeys.length) return;

    Object.assign(target, partials);
    persistStorage(name, target);
    const revision = nextPersistStoreRevision(name);

    syncStateToUI(BROADCAST_TO_UI_EVENTS.storeChanged, {
      bgStoreName: name,
      changedKey: changedKeys[0]!,
      changedKeys,
      partials,
      origin: persistStoreOrigin,
      revision,
    });
  };

  const store = new Proxy(tpl, {
    set(target, prop, value) {
      commitPartials(target, { [prop]: value } as Partial<T>);

      return true;
    },

    deleteProperty(target, prop) {
      if (Reflect.has(target, prop)) {
        Reflect.deleteProperty(target, prop);

        persistStorage(name, target);
      }

      return true;
    },
  });
  persistStoreMetadata.set(store, {
    applyPatch: (partials) => commitPartials(tpl, partials as Partial<T>),
    schema: schema as PersistStoreSchema<object> | undefined,
  });

  return store;
};

export default createPersistStore;
