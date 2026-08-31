import browser from 'webextension-polyfill';
import { ExtensionUpdateService } from '@/background/service/extensionUpdate';

jest.mock('webextension-polyfill', () => ({
  runtime: {
    getManifest: jest.fn(),
    onUpdateAvailable: { addListener: jest.fn() },
    requestUpdateCheck: jest.fn(),
    reload: jest.fn(),
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
    },
  },
}));

const getManifest = browser.runtime.getManifest as jest.Mock;
const getStorage = browser.storage.local.get as jest.Mock;
const setStorage = browser.storage.local.set as jest.Mock;
const addListener = browser.runtime.onUpdateAvailable.addListener as jest.Mock;

describe('extension update service', () => {
  let service: ExtensionUpdateService;
  let onUpdateAvailable: (details: { version: string }) => void;

  beforeEach(() => {
    jest.clearAllMocks();
    getManifest.mockReturnValue({ version: '1.0.0' });
    getStorage.mockResolvedValue({});
    setStorage.mockResolvedValue(undefined);
    service = new ExtensionUpdateService();
    service.init();
    onUpdateAvailable = addListener.mock.calls[0][0];
  });

  it('registers once without checking for updates or reloading', async () => {
    service.init();

    expect(addListener).toHaveBeenCalledTimes(1);
    await expect(service.getPendingVersion()).resolves.toBeNull();
    expect(browser.runtime.requestUpdateCheck).not.toHaveBeenCalled();
    expect(browser.runtime.reload).not.toHaveBeenCalled();
  });

  it('records an update without reloading, even when no UI is open', async () => {
    onUpdateAvailable({ version: '1.0.0.1' });

    await expect(service.getPendingVersion()).resolves.toBe('1.0.0.1');
    expect(setStorage).toHaveBeenCalledWith({
      pendingExtensionUpdate: {
        currentVersion: '1.0.0',
        version: '1.0.0.1',
      },
    });
    expect(browser.runtime.reload).not.toHaveBeenCalled();
  });

  it('restores an update after the service worker restarts', async () => {
    onUpdateAvailable({ version: '1.1.0' });
    getStorage.mockResolvedValue(setStorage.mock.calls[0][0]);

    const restartedService = new ExtensionUpdateService();
    await expect(restartedService.getPendingVersion()).resolves.toBe('1.1.0');
  });

  it.each(['1.1.0', '1.2.0'])(
    'ignores the old notification after version %s is installed',
    async (version) => {
      getStorage.mockResolvedValue({
        pendingExtensionUpdate: {
          currentVersion: '1.0.0',
          version: '1.1.0',
        },
      });
      getManifest.mockReturnValue({ version });

      await expect(service.getPendingVersion()).resolves.toBeNull();
    }
  );

  it('does not let a stale storage read overwrite a newer event', async () => {
    let resolveRead!: (value: object) => void;
    getStorage.mockReturnValue(
      new Promise((resolve) => {
        resolveRead = resolve;
      })
    );
    const pendingRead = service.getPendingVersion();

    onUpdateAvailable({ version: '1.2.0' });
    resolveRead({
      pendingExtensionUpdate: {
        currentVersion: '1.0.0',
        version: '1.1.0',
      },
    });

    await expect(pendingRead).resolves.toBe('1.2.0');
  });

  it('keeps the live update if persisting the notification fails', async () => {
    const error = new Error('Storage unavailable');
    setStorage.mockRejectedValueOnce(error);
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    try {
      onUpdateAvailable({ version: '1.1.0' });

      await expect(service.getPendingVersion()).resolves.toBe('1.1.0');
      expect(consoleError).toHaveBeenCalledWith(
        '[extensionUpdate] failed to persist update',
        error
      );
    } finally {
      consoleError.mockRestore();
    }
  });
});
