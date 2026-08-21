import { CHAINS_ENUM } from '@debank/common';

import type { CustomRPCServiceStore } from '@/background/service/rpc';
import { CUSTOM_RPC_ENABLED } from '@/constant';
import { wallet } from '@/ui/wallet';
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

/**
 * Reads come from the synced background snapshot; writes go through the
 * per-chain controller methods instead of persisting this store's own map.
 *
 * Persisting the map would replace the background copy wholesale, so a page
 * holding a stale map could resurrect an RPC that the signing flow just
 * auto-disabled, or drop another chain's entry entirely. The controller merges
 * one chain at a time and broadcasts the result back here.
 */
export const useCustomRPCStore = createRabbyStore<CustomRPCStore>(
  (_set, get) => ({
    customRPC: {},

    async getAllRPC() {
      await waitForHydration();
      return get().customRPC;
    },

    async setCustomRPC({ chain, url }) {
      if (!CUSTOM_RPC_ENABLED) return;
      await wallet.setCustomRPC(chain, url);
    },

    async setRPCEnable({ chain, enable }) {
      if (!CUSTOM_RPC_ENABLED) return;
      await waitForHydration();
      // The background builds the next item by spreading the current one, so
      // an unknown chain would produce an entry without a `url` and fail the
      // store schema.
      if (!get().customRPC[chain]) return;
      await wallet.setRPCEnable(chain, enable);
    },

    async deleteCustomRPC(chain) {
      if (!CUSTOM_RPC_ENABLED) return;
      await wallet.removeCustomRPC(chain);
    },
  }),
  createExtensionStoreOptions<CustomRPCStore, 'rpc'>({
    autoHydrate: true,
    storageKey: 'rpc',
    // Nothing here writes locally any more; kept so a future local `set` can
    // never push anything but `customRPC` back to the background.
    partialize(state) {
      return { customRPC: state.customRPC };
    },
    onError(error) {
      console.error('[customRPCStore]', error);
    },
  })
);
