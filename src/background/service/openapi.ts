import { INITIAL_OPENAPI_URL, INITIAL_TESTNET_OPENAPI_URL } from '@/constant';
import { OpenApiService } from '@rabby-wallet/rabby-api';
import { createPersistStore } from 'background/utils';
export * from '@rabby-wallet/rabby-api/dist/types';

const store = await createPersistStore({
  name: 'openapi',
  template: {
    host: INITIAL_OPENAPI_URL,
    testnetHost: INITIAL_TESTNET_OPENAPI_URL,
  },
});

const testnetStore = new (class TestnetStore {
  get host() {
    return store.testnetHost;
  }
  set host(value) {
    store.testnetHost = value;
  }
})();

if (!process.env.DEBUG) {
  store.host = INITIAL_OPENAPI_URL;
  store.testnetHost = INITIAL_TESTNET_OPENAPI_URL;
  testnetStore.host = INITIAL_TESTNET_OPENAPI_URL;
}

const service = new OpenApiService({
  store,
});

export const testnetOpenapiService = new OpenApiService({
  store: testnetStore,
});

export default service;
