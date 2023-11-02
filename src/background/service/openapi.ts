import { INITIAL_OPENAPI_URL, INITIAL_TESTNET_OPENAPI_URL } from '@/constant';
import { OpenApiService } from '@rabby-wallet/rabby-api';
import { createPersistStore } from 'background/utils';
export * from '@rabby-wallet/rabby-api/dist/types';

const testnetStore = new (class TestnetStore {
  store!: { host: string; testnetHost: string };

  constructor() {
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
  get host() {
    return this.store.testnetHost;
  }
  set host(value) {
    this.store.testnetHost = value;
  }
})();

const service = new OpenApiService({
  store: !process.env.DEBUG
    ? {
        host: INITIAL_OPENAPI_URL,
        testnetHost: INITIAL_TESTNET_OPENAPI_URL,
      }
    : createPersistStore({
        name: 'openapi',
        template: {
          host: INITIAL_OPENAPI_URL,
          testnetHost: INITIAL_TESTNET_OPENAPI_URL,
        },
      }),
});

export const testnetOpenapiService = new OpenApiService({
  store: !process.env.DEBUG
    ? {
        host: INITIAL_TESTNET_OPENAPI_URL,
        testnetHost: INITIAL_TESTNET_OPENAPI_URL,
      }
    : testnetStore,
});

export default service;
