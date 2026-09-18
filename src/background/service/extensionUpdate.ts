import { createPersistStore, patchPersistStore } from 'background/utils';
import browser from 'webextension-polyfill';
import { z } from 'zod';
import { isEqual } from 'lodash';
import { compareExtensionVersions } from '@/utils/extensionVersion';
import { storage } from '@/background/webapi';

const STORAGE_KEY = 'pendingExtensionUpdate';
const MANUAL_UPDATE_STORAGE_KEY = 'manualExtensionUpdate';
const manualUpdateSchema = z.object({
  fromVersion: z.string().regex(/^\d+(?:\.\d+){2,3}$/),
  toVersion: z.string().regex(/^\d+(?:\.\d+){2,3}$/),
});

const extensionUpdateStoreSchema = z.object({
  pendingVersion: z
    .union([z.literal(''), z.string().regex(/^\d+(?:\.\d+){2,3}$/)])
    .default(''),
  dismissedUntil: z.number().nonnegative().default(0),
  settingsCardDismissal: z
    .object({
      currentVersion: z.string(),
      pendingVersion: z.string(),
      level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
      dismissedUntil: z.number().nonnegative(),
    })
    .nullable()
    .default(null),
});

export type ExtensionUpdateStore = z.output<typeof extensionUpdateStoreSchema>;

const createExtensionUpdateStoreTemplate = (): ExtensionUpdateStore =>
  extensionUpdateStoreSchema.parse({});

export class ExtensionUpdateService {
  store: ExtensionUpdateStore = createExtensionUpdateStoreTemplate();
  private initPromise?: Promise<void>;
  private initialized = false;
  private pendingUpdate?: Pick<ExtensionUpdateStore, 'pendingVersion'>;
  private reloadPromise?: Promise<void>;
  private checkPromise?: Promise<void>;
  private lastCheckAt = 0;
  private lastCheckTarget = '';

  init = () => {
    if (this.initPromise) return this.initPromise;

    // Register before reading storage so MV3 startup cannot miss an update.
    browser.runtime.onUpdateAvailable.addListener(this.onUpdateAvailable);
    this.initPromise = (async () => {
      const saved = await storage.get(STORAGE_KEY);
      // Migrate legacy names before validation so pending updates and card
      // dismissals survive the rename. The installed version comes from Chrome.
      const template = {
        ...createExtensionUpdateStoreTemplate(),
        ...saved,
        pendingVersion: saved?.pendingVersion ?? saved?.version ?? '',
      };
      delete template.currentVersion;
      delete template.version;
      if (template.settingsCardDismissal) {
        const { version, ...dismissal } = template.settingsCardDismissal;
        template.settingsCardDismissal = {
          ...dismissal,
          pendingVersion: dismissal.pendingVersion ?? version,
        };
      }
      const store = await createPersistStore<ExtensionUpdateStore>({
        name: STORAGE_KEY,
        template,
        schema: extensionUpdateStoreSchema,
        fromStorage: false,
      });
      if (!isEqual(saved, store)) {
        await storage.set(STORAGE_KEY, { ...store });
      }
      this.store = store;
      this.initialized = true;
      // An update received during hydration takes precedence over storage.
      if (this.pendingUpdate) {
        this.patchStore(this.pendingUpdate);
        this.pendingUpdate = undefined;
      }
      // Clear applied/older updates only after handling events received during
      // startup, so a newer pending release is preserved.
      const { pendingVersion } = this.store;
      if (
        pendingVersion &&
        compareExtensionVersions(
          browser.runtime.getManifest().version,
          pendingVersion
        ) >= 0
      ) {
        this.patchStore({ pendingVersion: '' });
      }
    })();

    return this.initPromise;
  };

  patchStore = (partials: Partial<ExtensionUpdateStore>) => {
    patchPersistStore(this.store, partials);
  };

  private onUpdateAvailable = ({ version }: { version: string }) => {
    const update = {
      pendingVersion: version,
    };

    if (!this.initialized) {
      this.pendingUpdate = update;
      return;
    }
    this.patchStore(update);
  };

  getPendingVersion = async (): Promise<string | null> => {
    await this.init();
    const { pendingVersion } = this.store;
    const currentVersion = browser.runtime.getManifest().version;

    if (
      pendingVersion &&
      compareExtensionVersions(currentVersion, pendingVersion) < 0
    ) {
      return pendingVersion;
    }
    return null;
  };

  requestUpdateCheck = (latestVersion: string): Promise<void> => {
    if (this.checkPromise) return this.checkPromise;
    this.checkPromise = (async () => {
      const pending = await this.getPendingVersion();
      const installed = browser.runtime.getManifest().version;
      if (
        compareExtensionVersions(installed, latestVersion) >= 0 ||
        (pending && compareExtensionVersions(pending, latestVersion) >= 0)
      )
        return;
      if (
        this.lastCheckTarget === latestVersion &&
        Date.now() - this.lastCheckAt < 10 * 60 * 1000
      )
        return;
      if (!browser.runtime.requestUpdateCheck) return;
      this.lastCheckAt = Date.now();
      this.lastCheckTarget = latestVersion;
      // Only onUpdateAvailable may mark a version as downloaded and ready.
      // Chrome can return throttled/no_update; neither should show an update.
      await browser.runtime.requestUpdateCheck();
    })().finally(() => {
      this.checkPromise = undefined;
    });
    return this.checkPromise;
  };

  shouldShowFirstNotice = async (firstOpen: boolean): Promise<boolean> => {
    if (!firstOpen) return false;
    try {
      const manualUpdate = manualUpdateSchema.safeParse(
        await storage.get(MANUAL_UPDATE_STORAGE_KEY)
      );
      const installed = browser.runtime.getManifest().version;
      // Keep the marker version-scoped: a later automatic update must still
      // show its release notes, and multiple UI windows must all skip this one.
      return !(
        manualUpdate.success &&
        manualUpdate.data.toVersion === installed &&
        compareExtensionVersions(manualUpdate.data.fromVersion, installed) < 0
      );
    } catch (error) {
      console.error(
        '[extensionUpdate] failed to read manual update marker',
        error
      );
      return true;
    }
  };

  reloadForUpdate = (language = 'en'): Promise<void> => {
    this.reloadPromise ||= (async () => {
      const pendingVersion = await this.getPendingVersion();
      if (!pendingVersion) return;
      const currentVersion = browser.runtime.getManifest().version;

      // Opening an active tab closes the popup; finish the update in background.
      await browser.tabs.create({
        url: `https://rabby.io/updating?version=${encodeURIComponent(
          currentVersion
        )}&lang=${encodeURIComponent(language)}`,
        active: true,
      });
      const targetVersion = await this.getPendingVersion();
      if (!targetVersion) return;
      const previousMarker = await storage.get(MANUAL_UPDATE_STORAGE_KEY);
      // This background-only marker needs an awaited write: the ordinary
      // persisted-store setter is fire-and-forget and may not finish on reload.
      await storage.set(MANUAL_UPDATE_STORAGE_KEY, {
        fromVersion: currentVersion,
        toVersion: targetVersion,
      });
      try {
        browser.runtime.reload();
      } catch (error) {
        await storage.set(MANUAL_UPDATE_STORAGE_KEY, previousMarker ?? null);
        throw error;
      }
    })().finally(() => {
      this.reloadPromise = undefined;
    });
    return this.reloadPromise;
  };
}

export default new ExtensionUpdateService();
