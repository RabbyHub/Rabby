import browser from 'webextension-polyfill';

const STORAGE_KEY = 'pendingExtensionUpdate';

type PendingExtensionUpdate = {
  currentVersion: string;
  version: string;
};

export class ExtensionUpdateService {
  private initialized = false;
  private pendingUpdate?: PendingExtensionUpdate;

  init = () => {
    if (this.initialized) return;
    this.initialized = true;
    browser.runtime.onUpdateAvailable.addListener(this.onUpdateAvailable);
  };

  private onUpdateAvailable = ({ version }: { version: string }) => {
    this.pendingUpdate = {
      currentVersion: browser.runtime.getManifest().version,
      version,
    };

    // Keep the notification across popup closures and MV3 worker restarts.
    // Bind it to the installed version so an applied update cannot stay visible.
    void browser.storage.local
      .set({ [STORAGE_KEY]: this.pendingUpdate })
      .catch((error) => {
        console.error('[extensionUpdate] failed to persist update', error);
      });
  };

  getPendingVersion = async (): Promise<string | null> => {
    const stored = this.pendingUpdate
      ? undefined
      : (await browser.storage.local.get(STORAGE_KEY))[STORAGE_KEY];
    // An event received while storage was being read takes precedence.
    const update = this.pendingUpdate || stored;
    const currentVersion = browser.runtime.getManifest().version;

    if (
      update?.currentVersion === currentVersion &&
      typeof update.version === 'string' &&
      update.version &&
      update.version !== currentVersion
    ) {
      return update.version;
    }
    return null;
  };
}

export default new ExtensionUpdateService();
