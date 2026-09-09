import { createPersistStore, patchPersistStore } from 'background/utils';
import browser from 'webextension-polyfill';
import { z } from 'zod';

const STORAGE_KEY = 'pendingExtensionUpdate';

const extensionUpdateStoreSchema = z.object({
  currentVersion: z.string().default(''),
  version: z.string().default(''),
});

export type ExtensionUpdateStore = z.output<typeof extensionUpdateStoreSchema>;

const createExtensionUpdateStoreTemplate = (): ExtensionUpdateStore =>
  extensionUpdateStoreSchema.parse({});

export class ExtensionUpdateService {
  store: ExtensionUpdateStore = createExtensionUpdateStoreTemplate();
  private initPromise?: Promise<void>;
  private initialized = false;
  private pendingUpdate?: ExtensionUpdateStore;

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
}

export default new ExtensionUpdateService();
