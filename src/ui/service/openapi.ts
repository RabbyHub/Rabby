import {
  createOpenapiClient,
  createOpenapiStoreTemplate,
  createReadyOpenapiProxy,
  OpenapiClientStore,
  PublicOpenapiStore,
} from '@/services/openapi';
import { v4 as uuidv4 } from 'uuid';

type PublicOpenapiSnapshot = {
  origin: string;
  revision: number;
  state: PublicOpenapiStore;
};

type PublicOpenapiUpdate = {
  origin: string;
  revision: number;
  partials: Partial<PublicOpenapiStore>;
};

export type CreateUIOpenapiRuntimeOptions = {
  load: () => Promise<PublicOpenapiSnapshot>;
  commit: (partials: Partial<PublicOpenapiStore>) => Promise<void>;
  subscribe: (listener: (update: PublicOpenapiUpdate) => void) => () => void;
  onReconnect?: (listener: () => void) => () => void;
  onError?: (error: unknown) => void;
};

/**
 * UI pages use their own volatile API identity. The background's persisted
 * X-API-Key never crosses the extension message boundary.
 */
class UIOpenapiStore implements OpenapiClientStore {
  private state: OpenapiClientStore = {
    ...createOpenapiStoreTemplate(),
    apiKey: uuidv4(),
    apiTime: Math.floor(Date.now() / 1000),
  };
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
    const changed =
      typeof partials.host === 'string' && partials.host !== this.state.host;

    if (typeof partials.host === 'string') {
      this.state.host = partials.host;
    }
    if (persist && changed) {
      const patch: Partial<PublicOpenapiStore> = { host: this.state.host };
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
    this.state.apiKey = apiKey;
  }

  get apiTime() {
    return this.state.apiTime;
  }

  set apiTime(apiTime: number | null) {
    this.state.apiTime = apiTime;
  }

  flushPublicCommit = () => this.latestCommit;
}

export const createUIOpenapiRuntime = ({
  load,
  commit,
  subscribe,
  onReconnect,
  onError = (error) => console.error('[uiOpenapi]', error),
}: CreateUIOpenapiRuntimeOptions) => {
  const store = new UIOpenapiStore(commit, onError);
  const clients = createOpenapiClient(store);
  let disposed = false;
  let initialized = false;
  let initialization: Promise<void> | undefined;
  let reconfiguration = Promise.resolve();
  let latestOrigin: string | undefined;
  let latestRevision = -1;

  const scheduleReconfiguration = (changed: boolean) => {
    if (!initialized || !changed) return;
    reconfiguration = reconfiguration
      .then(() => {
        if (disposed) return;
        clients.openapi.initSync();
      })
      .catch(onError);
  };

  const applyUpdate = ({ origin, revision, partials }: PublicOpenapiUpdate) => {
    if (disposed) return;
    if (origin !== latestOrigin) {
      latestOrigin = origin;
      latestRevision = -1;
    }

    const accepted: Partial<PublicOpenapiStore> = {};
    if (revision > latestRevision && typeof partials.host === 'string') {
      accepted.host = partials.host;
      latestRevision = revision;
    }
    scheduleReconfiguration(store.applyPublicState(accepted));
  };

  const reload = async () => {
    const snapshot = await load();
    applyUpdate({
      origin: snapshot.origin,
      revision: snapshot.revision,
      partials: snapshot.state,
    });
  };

  const ensureReady = () => {
    initialization ||= (async () => {
      await reload();
      if (disposed) throw new Error('UI OpenAPI runtime disposed');
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

  const unsubscribe = subscribe(applyUpdate);
  const unsubscribeReconnect = onReconnect?.(() => {
    void reload().catch(onError);
  });

  // Start eagerly so the first business request usually sees a ready signer.
  const ready = getReady();
  void ready.catch(onError);

  return {
    openapi: createReadyOpenapiProxy(
      clients.openapi,
      getReady,
      store.flushPublicCommit
    ),
    ready,
    dispose() {
      disposed = true;
      unsubscribe();
      unsubscribeReconnect?.();
    },
  };
};
