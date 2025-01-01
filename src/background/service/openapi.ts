import { INITIAL_OPENAPI_URL, INITIAL_TESTNET_OPENAPI_URL } from '@/constant';
import { OpenApiService } from '@rabby-wallet/rabby-api';
import { createPersistStore } from 'background/utils';
export * from '@rabby-wallet/rabby-api/dist/types';
import { WebSignApiPlugin } from '@rabby-wallet/rabby-api/dist/plugins/web-sign';
import fetchAdapter from '@vespaiach/axios-fetch-adapter';

class baseStore {
  store: { host: string; testnetHost: string };

  constructor() {
    this.store = {
      host: INITIAL_OPENAPI_URL,
      testnetHost: INITIAL_TESTNET_OPENAPI_URL,
    };
    createPersistStore({
      name: 'openapi',
      template: {
        host: INITIAL_OPENAPI_URL,
        testnetHost: INITIAL_TESTNET_OPENAPI_URL,
      },
    }).then((res) => {
      this.store = res;
    });
  }
}

const testnetStore = new (class TestnetStore extends baseStore {
  constructor() {
    super();
  }
  get host() {
    return this.store.testnetHost;
  }
  set host(value) {
    this.store.testnetHost = value;
  }
})();

const proxyStore = new (class ProxyStore extends baseStore {
  constructor() {
    super();
  }

  get host() {
    return this.store.host;
  }
  set host(value) {
    this.store.host = value;
  }
  get testnetHost() {
    return this.store.testnetHost;
  }
  set testnetHost(value) {
    this.store.testnetHost = value;
  }
})();

const service = new OpenApiService({
  plugin: WebSignApiPlugin,
  adapter: fetchAdapter,
  store: !process.env.DEBUG
    ? {
        host: INITIAL_OPENAPI_URL,
        testnetHost: INITIAL_TESTNET_OPENAPI_URL,
      }
    : proxyStore,
});

export const testnetOpenapiService = new OpenApiService({
  plugin: WebSignApiPlugin,
  adapter: fetchAdapter,
  store: !process.env.DEBUG
    ? {
        host: INITIAL_TESTNET_OPENAPI_URL,
        testnetHost: INITIAL_TESTNET_OPENAPI_URL,
      }
    : testnetStore,
});

export default service;
