import type { ExtensionUpdateStore as ExtensionUpdateServiceStore } from '@/background/service/extensionUpdate';
import browser from 'webextension-polyfill';
import { wallet } from '@/ui/wallet';
import { createExtensionStoreOptions } from './createStore/createExtensionStoreOptions';
import { createRabbyStore } from './createStore/createRabbyStore';

export const selectHasNewExtensionVersion = (
  state: ExtensionUpdateServiceStore
) =>
  state.currentVersion === browser.runtime.getManifest().version &&
  !!state.version &&
  state.version !== state.currentVersion;

export type ExtensionUpdateStore = ExtensionUpdateServiceStore & {
  reloadForUpdate: () => Promise<void>;
};

export const useExtensionUpdateStore = createRabbyStore<ExtensionUpdateStore>(
  (_set, get) => ({
    currentVersion: '',
    version: '',
    async reloadForUpdate() {
      if (selectHasNewExtensionVersion(get())) {
        await wallet.reloadExtensionForUpdate();
      }
    },
  }),
  createExtensionStoreOptions<ExtensionUpdateStore, 'pendingExtensionUpdate'>({
    autoHydrate: true,
    storageKey: 'pendingExtensionUpdate',
    onError(error) {
      console.error('[extensionUpdateStore]', error);
    },
  })
);
