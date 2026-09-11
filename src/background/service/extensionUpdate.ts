import { createPersistStore, patchPersistStore } from 'background/utils';
import browser from 'webextension-polyfill';
import { z } from 'zod';
import { compareExtensionVersions } from '@/utils/extensionVersion';
import {
  isLocalUpdateTest,
  LOCAL_UPDATE_TEST_ORIGIN,
  MOCK_PENDING_VERSION,
} from '@/utils/extensionUpdateTest';
import { storage } from 'background/webapi';
import { nanoid } from 'nanoid';

const STORAGE_KEY = 'pendingExtensionUpdate';
const LOCAL_TEST_STORAGE_KEY = 'extensionUpdateLocalTest';
type LocalUpdateTest = {
  runtimeId: string;
  version: string;
  startedAt: number;
};

const extensionUpdateStoreSchema = z.object({
  currentVersion: z.string().default(''),
  version: z.string().default(''),
  dismissedUntil: z.number().nonnegative().default(0),
});

export type ExtensionUpdateStore = z.output<typeof extensionUpdateStoreSchema>;

const createExtensionUpdateStoreTemplate = (): ExtensionUpdateStore =>
  extensionUpdateStoreSchema.parse({});

export class ExtensionUpdateService {
  private runtimeId = nanoid();
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
      if (isLocalUpdateTest())
        this.onUpdateAvailable({ version: MOCK_PENDING_VERSION });
    });

    return this.initPromise;
  };

  patchStore = (partials: Partial<ExtensionUpdateStore>) => {
    patchPersistStore(this.store, partials);
  };

  private onUpdateAvailable = ({ version }: { version: string }) => {
    const update = {
      currentVersion: browser.runtime.getManifest().version,
      version: isLocalUpdateTest() ? MOCK_PENDING_VERSION : version,
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

  getLocalTestUpdateStatus = async () => {
    const pendingVersion = await this.getPendingVersion();
    if (isLocalUpdateTest()) {
      const test = await storage.get<LocalUpdateTest | undefined>(
        LOCAL_TEST_STORAGE_KEY
      );
      if (
        test?.runtimeId &&
        test.runtimeId !== this.runtimeId &&
        test.version === MOCK_PENDING_VERSION &&
        Date.now() >= test.startedAt &&
        Date.now() - test.startedAt < 10 * 60 * 1000
      ) {
        return { version: test.version, pendingVersion: null };
      }
    }
    return { version: browser.runtime.getManifest().version, pendingVersion };
  };

  reloadForUpdate = (): Promise<void> => {
    this.reloadPromise ||= (async () => {
      const version = await this.getPendingVersion();
      if (!version) return;

      if (isLocalUpdateTest()) {
        // Await persistence before opening the page/reloading. This runtime must
        // still report the old version; only the next runtime reports completion.
        const test: LocalUpdateTest = {
          runtimeId: this.runtimeId,
          version,
          startedAt: Date.now(),
        };
        await storage.set(LOCAL_TEST_STORAGE_KEY, test);
      }
      const origin = isLocalUpdateTest()
        ? LOCAL_UPDATE_TEST_ORIGIN
        : 'https://rabby.io';

      // Opening an active tab closes the popup; finish the update in background.
      await browser.tabs.create({
        url: `${origin}/updating?version=${encodeURIComponent(version)}`,
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
