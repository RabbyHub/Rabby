import { INITIAL_OPENAPI_URL } from '@/constant';
import type { PublicOpenapiStore } from '@/services/openapi';
import { createExtensionStoreOptions } from './createStore/createExtensionStoreOptions';
import { createRabbyStore } from './createStore/createRabbyStore';

type OpenapiActions = {
  setHost: (host: string) => void;
};

export type OpenapiStore = PublicOpenapiStore & OpenapiActions;

export const useOpenapiStore = createRabbyStore<OpenapiStore>(
  (set) => ({
    host: INITIAL_OPENAPI_URL,
    apiKey: null,
    apiTime: null,

    setHost(host) {
      set({ host });
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
