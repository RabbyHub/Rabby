import { CHAINS_ENUM } from '@debank/common';

import type { CustomRPCServiceStore } from '@/background/service/rpc';
import { CUSTOM_RPC_ENABLED } from '@/constant';
import { createExtensionStoreOptions } from './createStore/createExtensionStoreOptions';
import { createRabbyStore } from './createStore/createRabbyStore';

type CustomRPCActions = {
  getAllRPC: () => Promise<CustomRPCServiceStore['customRPC']>;
  setCustomRPC: (payload: { chain: CHAINS_ENUM; url: string }) => Promise<void>;
  setRPCEnable: (payload: {
    chain: CHAINS_ENUM;
    enable: boolean;
  }) => Promise<void>;
  deleteCustomRPC: (chain: CHAINS_ENUM) => Promise<void>;
};

export type CustomRPCStore = CustomRPCServiceStore & CustomRPCActions;

const waitForHydration = () => useCustomRPCStore.persist.hydrationPromise();

export const useCustomRPCStore = createRabbyStore<CustomRPCStore>(
  (set, get) => ({
    customRPC: {},

    async getAllRPC() {
      await waitForHydration();
      return get().customRPC;
    },

    async setCustomRPC({ chain, url }) {
      if (!CUSTOM_RPC_ENABLED) return;
      await waitForHydration();
      set((state) => ({
        customRPC: {
          ...state.customRPC,
          [chain]: state.customRPC[chain]
            ? { ...state.customRPC[chain], url }
            : { url, enable: true },
        },
      }));
      await useCustomRPCStore.persist.flush();
    },

    async setRPCEnable({ chain, enable }) {
      if (!CUSTOM_RPC_ENABLED) return;
      await waitForHydration();
      const rpc = get().customRPC[chain];
      if (!rpc) return;

      set((state) => ({
        customRPC: {
          ...state.customRPC,
          [chain]: { ...rpc, enable },
        },
      }));
      await useCustomRPCStore.persist.flush();
    },

    async deleteCustomRPC(chain) {
      if (!CUSTOM_RPC_ENABLED) return;
      await waitForHydration();
      if (!get().customRPC[chain]) return;

      set((state) => {
        const customRPC = { ...state.customRPC };
        delete customRPC[chain];
        return { customRPC };
      });
      await useCustomRPCStore.persist.flush();
    },
  }),
  createExtensionStoreOptions<CustomRPCStore, 'rpc'>({
    autoHydrate: true,
    storageKey: 'rpc',
    partialize(state) {
      return { customRPC: state.customRPC };
    },
    onError(error) {
      console.error('[customRPCStore]', error);
    },
  })
);
