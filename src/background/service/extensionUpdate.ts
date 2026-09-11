import { createPersistStore, patchPersistStore } from 'background/utils';
import browser from 'webextension-polyfill';
import { z } from 'zod';
import { compareExtensionVersions } from '@/utils/extensionVersion';

const STORAGE_KEY = 'pendingExtensionUpdate';

const extensionUpdateStoreSchema = z.object({
  currentVersion: z.string().default(''),
  version: z.string().default(''),
  dismissedUntil: z.number().nonnegative().default(0),
});

export type ExtensionUpdateStore = z.output<typeof extensionUpdateStoreSchema>;

const createExtensionUpdateStoreTemplate = (): ExtensionUpdateStore =>
  extensionUpdateStoreSchema.parse({});

export class ExtensionUpdateService {
  store: ExtensionUpdateStore = createExtensionUpdateStoreTemplate();
  private initPromise?: Promise<void>;
  private initialized = false;
  private pendingUpdate?: Pick<
    ExtensionUpdateStore,
    'version' | 'currentVersion'
  >;
  private reloadPromise?: Promise<void>;
  private checkPromise?: Promise<void>;
  private lastCheckAt = 0;
  private lastCheckTarget = '';

  init = () => {
    if (this.initPromise) return this.initPromise;

    // Register before reading storage so MV3 startup cannot miss an update.
    browser.runtime.onUpdateAvailable.addListener(this.onUpdateAvailable);
    this.initPromise = createPersistStore<ExtensionUpdateStore>({
      name: STORAGE_KEY,
      template: createExtensionUpdateStoreTemplate(),
      schema: extensionUpdateStoreSchema,
    }).then((store) => {
      this.store = store;
      this.initialized = true;
      // An update received during hydration takes precedence over storage.
      if (this.pendingUpdate) {
        this.patchStore(this.pendingUpdate);
        this.pendingUpdate = undefined;
      }
    });

    return this.initPromise;
  };

  patchStore = (partials: Partial<ExtensionUpdateStore>) => {
    patchPersistStore(this.store, partials);
  };

  private onUpdateAvailable = ({ version }: { version: string }) => {
    const update = {
      currentVersion: browser.runtime.getManifest().version,
      version,
    };

    if (!this.initialized) {
      this.pendingUpdate = update;
      return;
    }
    this.patchStore(update);
  };

  getPendingVersion = async (): Promise<string | null> => {
    await this.init();
    const update = this.store;
    const currentVersion = browser.runtime.getManifest().version;

    if (
      update.currentVersion === currentVersion &&
      update.version &&
      update.version !== currentVersion
    ) {
      return update.version;
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
        Date.now() - this.lastCheckAt < 5 * 60 * 1000
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

  reloadForUpdate = (): Promise<void> => {
    this.reloadPromise ||= (async () => {
      const version = await this.getPendingVersion();
      if (!version) return;

      // Opening an active tab closes the popup; finish the update in background.
      await browser.tabs.create({
        url: `https://rabby.io/updating?version=${encodeURIComponent(version)}`,
        active: true,
      });
      browser.runtime.reload();
    })().finally(() => {
      this.reloadPromise = undefined;
    });
    return this.reloadPromise;
  };
}

export default new ExtensionUpdateService();
