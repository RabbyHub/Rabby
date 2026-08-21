import type { PublicOpenapiStore } from '@/background/service/openapi';
import { INITIAL_OPENAPI_URL, INITIAL_TESTNET_OPENAPI_URL } from '@/constant';
import { createExtensionStoreOptions } from './createStore/createExtensionStoreOptions';
import { createRabbyStore } from './createStore/createRabbyStore';

type OpenapiActions = {
  setHost: (host: string) => void;
  setTestnetHost: (host: string) => void;
};

export type OpenapiStore = PublicOpenapiStore & OpenapiActions;

export const useOpenapiStore = createRabbyStore<OpenapiStore>(
  (set) => ({
    host: INITIAL_OPENAPI_URL,
    testnetHost: INITIAL_TESTNET_OPENAPI_URL,

    setHost(host) {
      set({ host });
    },
    setTestnetHost(testnetHost) {
      set({ testnetHost });
    },
  }),
  createExtensionStoreOptions<OpenapiStore, 'openapi'>({
    autoHydrate: true,
    storageKey: 'openapi',
    onError(error) {
      console.error('[openapiStore]', error);
    },
  })
);
