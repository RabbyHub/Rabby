import type { OpenApiService } from '@rabby-wallet/rabby-api';

import {
  createOpenapiClient,
  createReadyOpenapiProxy,
} from './createOpenapiClient';
import {
  createOpenapiStoreTemplate,
  OpenapiClientStore,
  PublicOpenapiStore,
} from './types';

export type PublicOpenapiSnapshot = {
  origin: string;
  revision: number;
  state: PublicOpenapiStore;
};

export type PublicOpenapiUpdate = {
  origin: string;
  revision: number;
  partials: Partial<PublicOpenapiStore>;
};

type OpenapiRuntimeCommonOptions = {
  onError?: (error: unknown) => void;
};

export type CreateUIOpenapiRuntimeOptions = OpenapiRuntimeCommonOptions & {
  kind: 'ui';
  load: () => Promise<PublicOpenapiSnapshot>;
  commit: (partials: Partial<PublicOpenapiStore>) => Promise<void>;
  subscribe: (listener: (update: PublicOpenapiUpdate) => void) => () => void;
  onReconnect?: (listener: () => void) => () => void;
};

export type CreateBackgroundOpenapiRuntimeOptions = OpenapiRuntimeCommonOptions & {
  kind: 'background';
  store: OpenapiClientStore;
  initializeStore: () => Promise<void>;
};

export type CreateOpenapiRuntimeOptions =
  | CreateUIOpenapiRuntimeOptions
  | CreateBackgroundOpenapiRuntimeOptions;

export type OpenapiRuntime = {
  openapi: OpenApiService;
  ready: Promise<void>;
  reconfigure: () => Promise<void>;
  dispose: () => void;
};

/** UI pages hydrate the OpenAPI identity persisted by the background. */
class UIOpenapiStore implements OpenapiClientStore {
  private state: OpenapiClientStore = createOpenapiStoreTemplate();
  private commitQueue = Promise.resolve();
  private latestCommit = Promise.resolve();

  constructor(
    private commit: (partials: Partial<PublicOpenapiStore>) => Promise<void>,
    private onError: (error: unknown) => void
  ) {}

  applyPublicState(
    partials: Partial<PublicOpenapiStore>,
    persist = false
  ): boolean {
    const patch: Partial<PublicOpenapiStore> = {};

    if (
      Object.prototype.hasOwnProperty.call(partials, 'host') &&
      typeof partials.host === 'string' &&
      partials.host !== this.state.host
    ) {
      patch.host = partials.host;
      this.state.host = partials.host;
    }

    if (
      Object.prototype.hasOwnProperty.call(partials, 'apiKey') &&
      (typeof partials.apiKey === 'string' || partials.apiKey === null) &&
      partials.apiKey !== this.state.apiKey
    ) {
      patch.apiKey = partials.apiKey;
      this.state.apiKey = partials.apiKey;
    }

    if (
      Object.prototype.hasOwnProperty.call(partials, 'apiTime') &&
      (typeof partials.apiTime === 'number' || partials.apiTime === null) &&
      partials.apiTime !== this.state.apiTime
    ) {
      patch.apiTime = partials.apiTime;
      this.state.apiTime = partials.apiTime;
    }

    const changed = Object.keys(patch).length > 0;
    if (persist && changed) {
      this.latestCommit = this.commitQueue.then(() => this.commit(patch));
      void this.latestCommit.catch(this.onError);
      this.commitQueue = this.latestCommit.catch(() => undefined);
    }

    return changed;
  }

  get host() {
    return this.state.host;
  }

  set host(host: string) {
    this.applyPublicState({ host }, true);
  }

  get apiKey() {
    return this.state.apiKey;
  }

  set apiKey(apiKey: string | null) {
    this.applyPublicState({ apiKey }, true);
  }

  get apiTime() {
    return this.state.apiTime;
  }

  set apiTime(apiTime: number | null) {
    this.applyPublicState({ apiTime }, true);
  }

  flushPublicCommit = () => this.latestCommit;
}

/**
 * Creates one OpenAPI runtime for the current JavaScript context. UI pages and
 * the background use the same lifecycle implementation but keep separate
 * stores and OpenApiService instances.
 */
export const createOpenapiRuntime = (
  options: CreateOpenapiRuntimeOptions
): OpenapiRuntime => {
  const onError =
    options.onError ||
    ((error: unknown) => console.error(`[${options.kind}Openapi]`, error));
  const uiOptions = options.kind === 'ui' ? options : undefined;
  const backgroundOptions = options.kind === 'background' ? options : undefined;
  const uiStore = uiOptions
    ? new UIOpenapiStore(uiOptions.commit, onError)
    : undefined;
  const store = uiStore || backgroundOptions!.store;
  const clients = createOpenapiClient(store);
  let disposed = false;
  let initialized = false;
  let initialization: Promise<void> | undefined;
  let reconfiguration = Promise.resolve();
  let latestOrigin: string | undefined;
  let latestRevision = -1;

  const scheduleReconfiguration = (changed = true) => {
    if (!initialized || !changed) return;
    reconfiguration = reconfiguration
      .then(() => {
        if (disposed) return;
        clients.openapi.initSync();
      })
      .catch(onError);
  };

  const applyUpdate = (
    { origin, revision, partials }: PublicOpenapiUpdate,
    acceptEqualRevision = false
  ) => {
    if (disposed || !uiStore) return;
    if (origin !== latestOrigin) {
      latestOrigin = origin;
      latestRevision = -1;
    }

    const accepted: Partial<PublicOpenapiStore> = {};
    if (
      revision > latestRevision ||
      (acceptEqualRevision && revision === latestRevision)
    ) {
      Object.assign(accepted, partials);
      latestRevision = revision;
    }
    scheduleReconfiguration(uiStore.applyPublicState(accepted));
  };

  const reload = async () => {
    if (!uiOptions) return;
    const snapshot = await uiOptions.load();
    applyUpdate(
      {
        origin: snapshot.origin,
        revision: snapshot.revision,
        partials: snapshot.state,
      },
      // A full snapshot may race with a partial broadcast for the same
      // revision after reconnect. Let the snapshot fill the remaining fields.
      true
    );
  };

  const ensureReady = () => {
    initialization ||= (async () => {
      if (backgroundOptions) {
        await backgroundOptions.initializeStore();
      } else {
        await reload();
      }
      if (disposed) {
        throw new Error(`${options.kind} OpenAPI runtime disposed`);
      }
      await clients.init();
      initialized = true;
    })().catch((error) => {
      initialization = undefined;
      throw error;
    });
    return initialization;
  };

  const getReady = async () => {
    await ensureReady();
    await reconfiguration;
  };

  const unsubscribe = uiOptions?.subscribe(applyUpdate);
  const unsubscribeReconnect = uiOptions?.onReconnect?.(() => {
    void reload().catch(onError);
  });

  // Start eagerly so the first business request usually sees a ready signer.
  const ready = getReady();
  void ready.catch(onError);

  return {
    openapi: uiStore
      ? createReadyOpenapiProxy(
          clients.openapi,
          getReady,
          uiStore.flushPublicCommit
        )
      : clients.openapi,
    ready,
    async reconfigure() {
      await ensureReady();
      scheduleReconfiguration();
      await reconfiguration;
    },
    dispose() {
      disposed = true;
      unsubscribe?.();
      unsubscribeReconnect?.();
    },
  };
};
