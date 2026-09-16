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
  UPDATE_SETTINGS_CARD_COOLDOWN,
} from '@/utils/extensionVersion';

export const selectHasNewExtensionVersion = (
  state: ExtensionUpdateServiceStore & { versionInfo: VersionInfo | null }
) =>
  !!state.versionInfo &&
  state.versionInfo.version.id === browser.runtime.getManifest().version &&
  !!state.pendingVersion &&
  state.pendingVersion === state.versionInfo.latest_version.id &&
  compareExtensionVersions(
    browser.runtime.getManifest().version,
    state.pendingVersion
  ) < 0;

export const selectExtensionUpdateLevel = ({
  versionInfo,
}: Pick<ExtensionUpdateStore, 'versionInfo'>) =>
  versionInfo?.version.level === 4
    ? versionInfo.version.level
    : versionInfo?.latest_version.level ?? 0;

export const selectExtensionUpdateBanner = (
  state: ExtensionUpdateStore,
  now = Date.now()
) => {
  const level = selectExtensionUpdateLevel(state);
  return (
    selectHasNewExtensionVersion(state) &&
    (level === 4 || (level === 3 && now >= state.dismissedUntil))
  );
};

export const selectExtensionUpdateSettingsCard = (
  state: ExtensionUpdateStore,
  now = Date.now()
) => {
  if (!selectHasNewExtensionVersion(state)) return false;
  const level = selectExtensionUpdateLevel(state);
  if (level === 4) return true;

  const dismissal = state.settingsCardDismissal;
  if (
    !dismissal ||
    dismissal.currentVersion !== browser.runtime.getManifest().version ||
    dismissal.pendingVersion !== state.pendingVersion
  )
    return true;

  // Low-priority dismissals survive level 1 <-> 2 changes, but not escalation.
  if (dismissal.level <= 2) return level >= 3;
  return now >= dismissal.dismissedUntil;
};

export const selectExtensionUpdateBadge = (
  state: ExtensionUpdateStore,
  now = Date.now()
) =>
  selectExtensionUpdateLevel(state) >= 2 &&
  selectExtensionUpdateSettingsCard(state, now);

let refreshPromise: Promise<void> | undefined;

export type ExtensionUpdateStore = ExtensionUpdateServiceStore & {
  versionInfo: VersionInfo | null;
  refreshVersionInfo: () => Promise<void>;
  dismissBanner: () => void;
  dismissSettingsCard: () => void;
  revealSettingsCard: () => void;
  reloadForUpdate: () => Promise<void>;
};

export const useExtensionUpdateStore = createRabbyStore<ExtensionUpdateStore>(
  (set, get) => ({
    pendingVersion: '',
    dismissedUntil: 0,
    settingsCardDismissal: null,
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
          const pending = get().pendingVersion;
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
      if (selectExtensionUpdateLevel(get()) === 3)
        set({ dismissedUntil: Date.now() + UPDATE_BANNER_COOLDOWN });
    },
    dismissSettingsCard() {
      const state = get();
      const level = selectExtensionUpdateLevel(state);
      if (
        !selectHasNewExtensionVersion(state) ||
        (level !== 1 && level !== 2 && level !== 3)
      )
        return;
      set({
        settingsCardDismissal: {
          currentVersion: browser.runtime.getManifest().version,
          pendingVersion: state.pendingVersion,
          level,
          dismissedUntil:
            level === 3 ? Date.now() + UPDATE_SETTINGS_CARD_COOLDOWN : 0,
        },
      });
    },
    revealSettingsCard() {
      const state = get();
      // The dashboard Check button can override only the level 3 card cooldown.
      if (
        selectHasNewExtensionVersion(state) &&
        selectExtensionUpdateLevel(state) === 3 &&
        state.settingsCardDismissal
      ) {
        set({ settingsCardDismissal: null });
      }
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
    partialize: (state) => ({
      dismissedUntil: state.dismissedUntil,
      settingsCardDismissal: state.settingsCardDismissal,
    }),
    onError(error) {
      console.error('[extensionUpdateStore]', error);
    },
  })
);
