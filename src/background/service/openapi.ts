import { INITIAL_OPENAPI_URL, INITIAL_TESTNET_OPENAPI_URL } from '@/constant';
import { OpenApiService } from '@rabby-wallet/rabby-api';
import { createPersistStore } from 'background/utils';
export * from '@rabby-wallet/rabby-api/dist/types';
import { WebSignApiPlugin } from '@rabby-wallet/rabby-api/dist/plugins/web-sign';
import fetchAdapter from 'background/utils/fetchAdapter';
import { v4 as uuidv4 } from 'uuid';

class baseStore {
  store: {
    host: string;
    testnetHost: string;
    apiKey: string | null;
    apiTime: number | null;
  };

  constructor() {
    this.store = {
      host: INITIAL_OPENAPI_URL,
      testnetHost: INITIAL_TESTNET_OPENAPI_URL,
      apiKey: null,
      apiTime: null,
    };
    createPersistStore({
      name: 'openapi',
      template: {
        host: INITIAL_OPENAPI_URL,
        testnetHost: INITIAL_TESTNET_OPENAPI_URL,
        apiKey: null,
        apiTime: null,
      },
    }).then((res) => {
      this.store = res;
      if (!this.store.apiKey) {
        this.generateAPIKey();
      }
    });
  }

  get host() {
    return this.store.host;
  }

  set host(value: string) {
    this.store.host = value;
  }

  get testnetHost() {
    return this.store.testnetHost;
  }

  set testnetHost(value: string) {
    this.store.testnetHost = value;
  }

  get apiKey() {
    return this.store.apiKey;
  }

  set apiKey(value: string | null) {
    this.store.apiKey = value;
  }

  get apiTime() {
    return this.store.apiTime;
  }

  set apiTime(value: number | null) {
    this.store.apiTime = value;
  }

  generateAPIKey = () => {
    const uuid = uuidv4();
    this.store.apiKey = uuid;
    this.store.apiTime = Math.floor(Date.now() / 1000);
  };
}

const testnetStore = new (class TestnetStore extends baseStore {
  constructor() {
    super();
  }
  get host() {
    return this.store.testnetHost;
  }
  set host(value: string) {
    this.store.testnetHost = value;
  }
})();

const proxyStore = new baseStore();

if (!process.env.DEBUG) {
  proxyStore.host = INITIAL_OPENAPI_URL;
  proxyStore.testnetHost = INITIAL_TESTNET_OPENAPI_URL;
  testnetStore.host = INITIAL_TESTNET_OPENAPI_URL;
  testnetStore.testnetHost = INITIAL_TESTNET_OPENAPI_URL;
}

const service = new OpenApiService({
  plugin: WebSignApiPlugin,
  adapter: fetchAdapter,
  store: proxyStore,
});

// TODO: 移动端抄过来的，放在这不一定合适，用的组件调用也行？
service.initSync();

export const testnetOpenapiService = new OpenApiService({
  plugin: WebSignApiPlugin,
  adapter: fetchAdapter,
  store: testnetStore,
});

export default service;
