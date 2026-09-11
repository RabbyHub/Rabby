import type { ExtensionUpdateStore as ExtensionUpdateServiceStore } from '@/background/service/extensionUpdate';
import browser from 'webextension-polyfill';
import { wallet } from '@/ui/wallet';
import { createExtensionStoreOptions } from './createStore/createExtensionStoreOptions';
import { createRabbyStore } from './createStore/createRabbyStore';
import {
  compareExtensionVersions,
  versionInfoSchema,
  versionInfoResponseSchema,
  VersionInfo,
  UPDATE_BANNER_COOLDOWN,
} from '@/utils/extensionVersion';

export const selectHasNewExtensionVersion = (
  state: ExtensionUpdateServiceStore & { versionInfo: VersionInfo | null }
) =>
  !!state.versionInfo &&
  state.versionInfo.version.id === browser.runtime.getManifest().version &&
  state.currentVersion === browser.runtime.getManifest().version &&
  !!state.version &&
  state.version === state.versionInfo.latest_version.id &&
  compareExtensionVersions(state.currentVersion, state.version) < 0;

export const selectExtensionUpdateBadge = (state: ExtensionUpdateStore) =>
  selectHasNewExtensionVersion(state) && state.versionInfo!.version.level >= 2;

export const selectExtensionUpdateBanner = (
  state: ExtensionUpdateStore,
  now = Date.now()
) =>
  selectHasNewExtensionVersion(state) &&
  (state.versionInfo!.version.level === 4 ||
    (state.versionInfo!.version.level === 3 && now >= state.dismissedUntil));

let refreshPromise: Promise<void> | undefined;

export type ExtensionUpdateStore = ExtensionUpdateServiceStore & {
  versionInfo: VersionInfo | null;
  refreshVersionInfo: () => Promise<void>;
  dismissBanner: () => void;
  reloadForUpdate: () => Promise<void>;
};

export const useExtensionUpdateStore = createRabbyStore<ExtensionUpdateStore>(
  (set, get) => ({
    currentVersion: '',
    version: '',
    dismissedUntil: 0,
    versionInfo: null,
    refreshVersionInfo() {
      refreshPromise ||= (async () => {
        await useExtensionUpdateStore.persist.hydrate();
        const installed = browser.runtime.getManifest().version;
        try {
          const response = versionInfoResponseSchema.parse(
            await wallet.openapi.getVersionInfo({ version_id: installed })
          );
          // Test/gray releases may be absent, and an empty table has no latest version.
          // Without a current-version policy, do not infer an update level.
          if (!response.version || !response.latest_version) {
            set({ versionInfo: null });
            return;
          }
          const info = versionInfoSchema.parse(response);
          if (info.version.id !== installed)
            throw new Error('Version info does not match installed extension');
          set({ versionInfo: info });
          const state = get();
          const pending =
            state.currentVersion === installed ? state.version : '';
          if (
            compareExtensionVersions(installed, info.latest_version.id) < 0 &&
            (!pending ||
              compareExtensionVersions(pending, info.latest_version.id) < 0)
          ) {
            await wallet
              .requestExtensionUpdateCheck(info.latest_version.id)
              .catch((error) => {
                console.error(
                  '[extensionUpdateStore] Chrome update check failed',
                  error
                );
              });
          }
        } catch (error) {
          set({ versionInfo: null });
          console.error('[extensionUpdateStore] version check failed', error);
        }
      })().finally(() => {
        refreshPromise = undefined;
      });
      return refreshPromise;
    },
    dismissBanner() {
      if (get().versionInfo?.version.level === 3)
        set({ dismissedUntil: Date.now() + UPDATE_BANNER_COOLDOWN });
    },
    async reloadForUpdate() {
      if (selectHasNewExtensionVersion(get())) {
        await wallet.reloadExtensionForUpdate();
      }
    },
  }),
  createExtensionStoreOptions<ExtensionUpdateStore, 'pendingExtensionUpdate'>({
    autoHydrate: true,
    storageKey: 'pendingExtensionUpdate',
    partialize: (state) => ({ dismissedUntil: state.dismissedUntil }),
    onError(error) {
      console.error('[extensionUpdateStore]', error);
    },
  })
);
