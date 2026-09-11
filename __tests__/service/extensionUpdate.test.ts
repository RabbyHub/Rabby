import browser from 'webextension-polyfill';
import { ExtensionUpdateService } from '@/background/service/extensionUpdate';
import { storage } from '@/background/webapi';
import * as env from '@/utils/env';

jest.mock('@/utils/env', () => ({ __esModule: true, appIsDev: false }));

jest.mock('@/background/utils', () => {
  const { default: createPersistStore, patchPersistStore } = jest.requireActual(
    '@/background/utils/persistStore'
  );
  return { createPersistStore, patchPersistStore };
});

jest.mock('@/background/webapi', () => ({
  storage: { get: jest.fn(), set: jest.fn() },
}));

jest.mock('@/background/utils/broadcastToUI', () => ({
  syncStateToUI: jest.fn(),
}));

jest.mock('webextension-polyfill', () => ({
  tabs: { create: jest.fn() },
  runtime: {
    getManifest: jest.fn(),
    onUpdateAvailable: { addListener: jest.fn() },
    requestUpdateCheck: jest.fn(),
    reload: jest.fn(),
  },
}));

const getManifest = browser.runtime.getManifest as jest.Mock;
const getStorage = storage.get as jest.Mock;
const setStorage = storage.set as jest.Mock;
const addListener = browser.runtime.onUpdateAvailable.addListener as jest.Mock;

describe('extension update service', () => {
  let service: ExtensionUpdateService;
  let onUpdateAvailable: (details: { version: string }) => void;

  beforeEach(() => {
    jest.clearAllMocks();
    (env as any).appIsDev = false;
    getManifest.mockReturnValue({ version: '1.0.0' });
    getStorage.mockResolvedValue({});
    setStorage.mockResolvedValue(undefined);
    (browser.tabs.create as jest.Mock).mockResolvedValue({ id: 1 });
    service = new ExtensionUpdateService();
    onUpdateAvailable = (details) => addListener.mock.calls[0][0](details);
  });

  it('mocks completion only in the next runtime and opens localhost for local tests', async () => {
    (env as any).appIsDev = true;
    getManifest.mockReturnValue({ version: '0.94.7' });
    const values = new Map<string, unknown>();
    getStorage.mockImplementation(async (key: string) => values.get(key));
    setStorage.mockImplementation(async (key: string, value: unknown) => {
      values.set(key, value);
    });
    await expect(service.getLocalTestUpdateStatus()).resolves.toEqual({
      version: '0.94.7',
      pendingVersion: '0.94.8',
    });
    await service.reloadForUpdate();
    expect(browser.tabs.create).toHaveBeenCalledWith({
      url: 'http://localhost:5173/updating?version=0.94.8',
      active: true,
    });
    expect(browser.runtime.reload).toHaveBeenCalledTimes(1);
    await expect(service.getLocalTestUpdateStatus()).resolves.toEqual({
      version: '0.94.7',
      pendingVersion: '0.94.8',
    });
    const restarted = new ExtensionUpdateService();
    await expect(restarted.getLocalTestUpdateStatus()).resolves.toEqual({
      version: '0.94.8',
      pendingVersion: null,
    });
    expect(browser.runtime.getManifest().version).toBe('0.94.7');
    const record = values.get('extensionUpdateLocalTest') as {
      startedAt: number;
    };
    values.set('extensionUpdateLocalTest', {
      ...record,
      startedAt: Date.now() - 600001,
    });
    await expect(restarted.getLocalTestUpdateStatus()).resolves.toEqual({
      version: '0.94.7',
      pendingVersion: '0.94.8',
    });
  });

  it('does not open or reload when the local test marker cannot be persisted', async () => {
    (env as any).appIsDev = true;
    await service.init();
    setStorage.mockRejectedValueOnce(new Error('storage failed'));
    await expect(service.reloadForUpdate()).rejects.toThrow('storage failed');
    expect(browser.tabs.create).not.toHaveBeenCalled();
    expect(browser.runtime.reload).not.toHaveBeenCalled();
  });

  it('registers once without checking for updates or reloading', async () => {
    service.init();
    service.init();

    expect(addListener).toHaveBeenCalledTimes(1);
    await expect(service.getPendingVersion()).resolves.toBeNull();
    expect(getStorage).toHaveBeenCalledTimes(1);
    expect(browser.runtime.requestUpdateCheck).not.toHaveBeenCalled();
    expect(browser.runtime.reload).not.toHaveBeenCalled();
  });

  it('records an update without reloading, even when no UI is open', async () => {
    await service.init();
    onUpdateAvailable({ version: '1.0.0.1' });

    await expect(service.getPendingVersion()).resolves.toBe('1.0.0.1');
    expect(setStorage).toHaveBeenCalledWith('pendingExtensionUpdate', {
      currentVersion: '1.0.0',
      version: '1.0.0.1',
      dismissedUntil: 0,
    });
    expect(browser.runtime.reload).not.toHaveBeenCalled();
  });

  it('restores an update after the service worker restarts', async () => {
    await service.init();
    onUpdateAvailable({ version: '1.1.0' });
    getStorage.mockResolvedValue(setStorage.mock.calls[0][1]);

    const restartedService = new ExtensionUpdateService();
    await expect(restartedService.getPendingVersion()).resolves.toBe('1.1.0');
  });

  it.each(['1.1.0', '1.2.0'])(
    'ignores the old notification after version %s is installed',
    async (version) => {
      getStorage.mockResolvedValue({
        currentVersion: '1.0.0',
        version: '1.1.0',
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
      currentVersion: '1.0.0',
      version: '1.1.0',
    });

    await expect(pendingRead).resolves.toBe('1.2.0');
    expect(setStorage).toHaveBeenLastCalledWith('pendingExtensionUpdate', {
      currentVersion: '1.0.0',
      version: '1.2.0',
      dismissedUntil: 0,
    });
  });

  it('repairs invalid persisted fields and accepts subsequent updates', async () => {
    getStorage.mockResolvedValue({ currentVersion: null, version: 42 });

    await expect(service.getPendingVersion()).resolves.toBeNull();
    expect(service.store).toEqual({
      currentVersion: '',
      version: '',
      dismissedUntil: 0,
    });

    onUpdateAvailable({ version: '1.1.0' });
    await expect(service.getPendingVersion()).resolves.toBe('1.1.0');
  });

  it('preserves the previous store when a patch fails schema validation', async () => {
    await service.init();
    onUpdateAvailable({ version: '1.1.0' });
    setStorage.mockClear();

    expect(() =>
      service.patchStore({ currentVersion: '2.0.0', version: null as any })
    ).toThrow();
    expect(setStorage).not.toHaveBeenCalled();
    await expect(service.getPendingVersion()).resolves.toBe('1.1.0');
  });

  it('checks for an update when pending is absent, deduplicates and cools down', async () => {
    (browser.runtime.requestUpdateCheck as jest.Mock).mockResolvedValue([
      'no_update',
    ]);
    const check = service.requestUpdateCheck('1.2.0');
    expect(service.requestUpdateCheck('1.2.0')).toBe(check);
    await check;
    await service.requestUpdateCheck('1.2.0');
    expect(browser.runtime.requestUpdateCheck).toHaveBeenCalledTimes(1);
    expect(await service.getPendingVersion()).toBeNull();
    await service.requestUpdateCheck('1.3.0');
    expect(browser.runtime.requestUpdateCheck).toHaveBeenCalledTimes(2);
  });

  it.each(['1.0.0', '0.9.0'])(
    'does not request an installed or older target %s',
    async (target) => {
      await service.requestUpdateCheck(target);
      expect(browser.runtime.requestUpdateCheck).not.toHaveBeenCalled();
    }
  );

  it.each([
    ['1.1.0', 1],
    ['1.2.0', 0],
    ['1.3.0', 0],
  ])(
    'checks only if pending %s is behind the target',
    async (pending, count) => {
      await service.init();
      onUpdateAvailable({ version: pending as string });
      await service.requestUpdateCheck('1.2.0');
      expect(browser.runtime.requestUpdateCheck).toHaveBeenCalledTimes(
        count as number
      );
    }
  );

  it('keeps pending unchanged when Chrome throttles or fails', async () => {
    (browser.runtime.requestUpdateCheck as jest.Mock).mockResolvedValueOnce([
      'throttled',
    ]);
    await service.requestUpdateCheck('1.2.0');
    expect(await service.getPendingVersion()).toBeNull();
    (browser.runtime.requestUpdateCheck as jest.Mock).mockRejectedValueOnce(
      new Error('unavailable')
    );
    await expect(service.requestUpdateCheck('1.3.0')).rejects.toThrow(
      'unavailable'
    );
    expect(await service.getPendingVersion()).toBeNull();
  });

  it('persists banner cooldown across background restarts', async () => {
    await service.init();
    service.patchStore({ dismissedUntil: Date.now() + 86400000 });
    getStorage.mockResolvedValue({ ...service.store });
    const restarted = new ExtensionUpdateService();
    await restarted.init();
    expect(restarted.store.dismissedUntil).toBe(service.store.dismissedUntil);
  });

  it('does not open a tab or reload without a pending update', async () => {
    await service.reloadForUpdate();
    expect(browser.tabs.create).not.toHaveBeenCalled();
    expect(browser.runtime.reload).not.toHaveBeenCalled();
  });

  it('waits for the updating tab before reloading and deduplicates concurrent requests', async () => {
    await service.init();
    onUpdateAvailable({ version: '1.1.0' });
    let resolveTab!: (tab: object) => void;
    const tabCreated = new Promise((resolve) => {
      resolveTab = resolve;
    });
    (browser.tabs.create as jest.Mock).mockReturnValue(tabCreated);

    const reload = service.reloadForUpdate();
    expect(service.reloadForUpdate()).toBe(reload);
    await service.getPendingVersion();
    expect(browser.tabs.create).toHaveBeenCalledTimes(1);
    expect(browser.tabs.create).toHaveBeenCalledWith({
      url: 'https://rabby.io/updating?version=1.1.0',
      active: true,
    });
    expect(browser.runtime.reload).not.toHaveBeenCalled();
    resolveTab({ id: 1 });
    await reload;
    expect(browser.runtime.reload).toHaveBeenCalledTimes(1);
  });

  it('does not reload if opening the tab fails and allows retry', async () => {
    await service.init();
    onUpdateAvailable({ version: '1.1.0' });
    const error = new Error('Cannot create tab');
    (browser.tabs.create as jest.Mock).mockRejectedValueOnce(error);

    await expect(service.reloadForUpdate()).rejects.toThrow(error);
    expect(browser.runtime.reload).not.toHaveBeenCalled();
    await service.reloadForUpdate();
    expect(browser.runtime.reload).toHaveBeenCalledTimes(1);
  });
});
