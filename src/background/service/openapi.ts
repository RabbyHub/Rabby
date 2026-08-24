import { INITIAL_OPENAPI_URL } from '@/constant';
import {
  createOpenapiClient,
  createOpenapiStoreTemplate,
  OpenapiServiceStore,
  openapiStoreSchema,
  pickPublicOpenapiStore,
  PUBLIC_OPENAPI_KEYS,
  PublicOpenapiStore,
} from '@/services/openapi';
import { createPersistStore, patchPersistStore } from 'background/utils';
import { v4 as uuidv4 } from 'uuid';

export * from '@/services/openapi';

class OpenapiStore {
  store: OpenapiServiceStore = createOpenapiStoreTemplate();
  private initialized = false;
  private initialization: Promise<void>;

  constructor() {
    this.initialization = this.initialize();
  }

  private initialize = async () => {
    this.store = await createPersistStore<OpenapiServiceStore>({
      name: 'openapi',
      template: createOpenapiStoreTemplate(),
      schema: openapiStoreSchema,
      broadcastKeys: PUBLIC_OPENAPI_KEYS,
    });
    // Remove the legacy endpoint after upgrading from builds that persisted a
    // separate testnet OpenAPI client. Unknown schema keys are otherwise kept
    // by the generic persistence layer to support downgrades.
    Reflect.deleteProperty(this.store, 'testnetHost');
    this.initialized = true;
    if (!this.store.apiKey) {
      this.generateAPIKey();
    }
  };

  init = () => this.initialization;

  getStore = () => this.store;

  patchStore = (partials: Partial<OpenapiServiceStore>) => {
    if (!this.initialized) {
      Object.assign(this.store, partials);
      return;
    }
    patchPersistStore(this.store, partials);
  };

  get host() {
    return this.store.host;
  }

  set host(value: string) {
    this.patchStore({ host: value });
  }

  get apiKey() {
    return this.store.apiKey;
  }

  set apiKey(value: string | null) {
    this.patchStore({ apiKey: value });
  }

  get apiTime() {
    return this.store.apiTime;
  }

  set apiTime(value: number | null) {
    this.patchStore({ apiTime: value });
  }

  generateAPIKey = () => {
    this.patchStore({
      apiKey: uuidv4(),
      apiTime: Math.floor(Date.now() / 1000),
    });
  };
}

const proxyStore = new OpenapiStore();

if (!process.env.DEBUG) {
  proxyStore.host = INITIAL_OPENAPI_URL;
}

const clients = createOpenapiClient(proxyStore);
const service = clients.openapi;

export const initializeOpenapiStore = () => proxyStore.init();
export const initializeOpenapiClients = () => clients.init();

export const getOpenapiStore = (): PublicOpenapiStore =>
  pickPublicOpenapiStore(proxyStore.getStore());

export const patchOpenapiStore = async (
  partials: Partial<PublicOpenapiStore>
) => {
  // Reachable from the UI through `setStorageItem`, so drop anything outside
  // the public half instead of trusting the caller's typing.
  proxyStore.patchStore(pickPublicOpenapiStore(partials));

  // The signer was initialized during background startup. Host changes only
  // need to rebuild the axios client and can therefore stay synchronous.
  if (Object.prototype.hasOwnProperty.call(partials, 'host')) {
    service.initSync();
  }
};

export default service;
