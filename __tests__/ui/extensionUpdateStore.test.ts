import { act, createElement } from 'react';
import { createRoot, Root } from 'react-dom/client';
import browser from 'webextension-polyfill';
import eventBus from '@/eventBus';
import {
  selectHasNewExtensionVersion,
  selectExtensionUpdateBadge,
  selectExtensionUpdateBanner,
  useExtensionUpdateStore,
} from '@/ui/state/extensionUpdate';
import { wallet } from '@/ui/wallet';
import { BROADCAST_TO_UI_EVENTS } from '@/utils/broadcastToUI';
import { VersionInfo, UPDATE_BANNER_COOLDOWN } from '@/utils/extensionVersion';

const makeInfo = (latest = '1.1.0', level: 1 | 2 | 3 | 4 = 2): VersionInfo => ({
  version: { id: '1.0.0', level, changelog: 'Current' },
  latest_version: { id: latest, level: 1, changelog: 'Latest' },
});

jest.mock('webextension-polyfill', () => ({
  runtime: {
    getManifest: jest.fn(() => ({ version: '1.0.0' })),
    onUpdateAvailable: { addListener: jest.fn() },
    reload: jest.fn(),
    requestUpdateCheck: jest.fn(),
  },
}));

jest.mock('@/ui/wallet', () => ({
  wallet: {
    getStorageSnapshot: jest.fn().mockResolvedValue({
      origin: 'background-1',
      revision: 1,
      state: { currentVersion: '1.0.0', version: '1.1.0' },
    }),
    setStorageItem: jest.fn(),
    reloadExtensionForUpdate: jest.fn().mockResolvedValue(undefined),
    requestExtensionUpdateCheck: jest.fn().mockResolvedValue(undefined),
    openapi: { getVersionInfo: jest.fn() },
  },
  onWalletReconnect: jest.fn(() => () => undefined),
}));

const UpdateButton = () => {
  const hasNewVersion = useExtensionUpdateStore(selectHasNewExtensionVersion);
  const reloadForUpdate = useExtensionUpdateStore((s) => s.reloadForUpdate);
  return createElement(
    'button',
    { onClick: reloadForUpdate },
    hasNewVersion ? 'Update available' : 'No update'
  );
};

let revision = 1;
const broadcast = (
  partials: { currentVersion?: string; version?: string },
  nextRevision = ++revision,
  origin = 'background-1'
) => {
  eventBus.emit(BROADCAST_TO_UI_EVENTS.storeChanged, {
    bgStoreName: 'pendingExtensionUpdate',
    changedKey: Object.keys(partials)[0],
    changedKeys: Object.keys(partials),
    partials,
    origin,
    revision: nextRevision,
  });
};

describe('extension update store', () => {
  let container: HTMLDivElement;
  let root: Root;
  const previousActEnvironment = (globalThis as any).IS_REACT_ACT_ENVIRONMENT;

  beforeAll(async () => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    await useExtensionUpdateStore.persist.hydrationPromise();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (browser.runtime.getManifest as jest.Mock).mockReturnValue({
      version: '1.0.0',
    });
    useExtensionUpdateStore.setState({ versionInfo: makeInfo() });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  afterAll(() => {
    useExtensionUpdateStore.persist.destroy();
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
  });

  const render = async () => {
    await act(async () => root.render(createElement(UpdateButton)));
  };

  it('automatically hydrates a pending update received while the UI was closed', async () => {
    expect(useExtensionUpdateStore.persist.hasHydrated()).toBe(true);
    expect(useExtensionUpdateStore.getState()).toMatchObject({
      currentVersion: '1.0.0',
      version: '1.1.0',
    });
    await render();
    expect(container.textContent).toBe('Update available');
    expect(wallet.setStorageItem).not.toHaveBeenCalled();
  });

  it('does not register a runtime listener, request an update check or reload without an update', async () => {
    broadcast({ currentVersion: '', version: '' });
    await render();
    act(() => container.querySelector('button')!.click());
    expect(container.textContent).toBe('No update');
    expect(
      browser.runtime.onUpdateAvailable.addListener
    ).not.toHaveBeenCalled();
    expect(browser.runtime.requestUpdateCheck).not.toHaveBeenCalled();
    expect(browser.runtime.reload).not.toHaveBeenCalled();
    expect(wallet.reloadExtensionForUpdate).not.toHaveBeenCalled();
  });

  it('updates every subscriber from a background broadcast without writeback and reloads only on click', async () => {
    broadcast({ currentVersion: '', version: '' });
    await act(async () => {
      root.render(
        createElement(
          'div',
          null,
          createElement(UpdateButton),
          createElement(UpdateButton)
        )
      );
    });
    act(() => broadcast({ currentVersion: '1.0.0', version: '1.1.0' }));
    expect(container.textContent).toBe('Update availableUpdate available');
    expect(browser.runtime.reload).not.toHaveBeenCalled();
    await useExtensionUpdateStore.persist.flush();
    expect(wallet.setStorageItem).not.toHaveBeenCalled();

    await act(async () => container.querySelector('button')!.click());
    expect(wallet.reloadExtensionForUpdate).toHaveBeenCalledTimes(1);
    expect(browser.runtime.reload).not.toHaveBeenCalled();
  });

  it('ignores stale broadcasts', () => {
    broadcast({ currentVersion: '1.0.0', version: '1.1.0' });
    broadcast({ version: '' }, revision - 1);
    expect(useExtensionUpdateStore.getState().version).toBe('1.1.0');
  });

  it.each(['1.1.0', '1.2.0'])(
    'does not show or reload an applied update on version %s',
    async (version) => {
      broadcast({ currentVersion: '1.0.0', version: '1.1.0' });
      (browser.runtime.getManifest as jest.Mock).mockReturnValue({ version });
      await render();
      expect(container.textContent).toBe('No update');
      await useExtensionUpdateStore.getState().reloadForUpdate();
      expect(browser.runtime.reload).not.toHaveBeenCalled();
      expect(wallet.reloadExtensionForUpdate).not.toHaveBeenCalled();
    }
  );

  it('does not treat the installed version itself as an update', () => {
    broadcast({ currentVersion: '1.0.0', version: '1.0.0' });
    expect(
      selectHasNewExtensionVersion(useExtensionUpdateStore.getState())
    ).toBe(false);
  });

  it.each([1, 2, 3, 4] as const)(
    'uses current version level %s for banner and badge',
    (level) => {
      const state = {
        ...useExtensionUpdateStore.getState(),
        currentVersion: '1.0.0',
        version: '1.1.0',
        versionInfo: makeInfo('1.1.0', level),
        dismissedUntil: 0,
      };
      expect(selectHasNewExtensionVersion(state)).toBe(true);
      expect(selectExtensionUpdateBadge(state)).toBe(level >= 2);
      expect(selectExtensionUpdateBanner(state)).toBe(level >= 3);
      const cooling = {
        ...state,
        dismissedUntil: Date.now() + UPDATE_BANNER_COOLDOWN,
      };
      expect(selectExtensionUpdateBanner(cooling)).toBe(level === 4);
      expect(selectExtensionUpdateBadge(cooling)).toBe(level >= 2);
      expect(selectExtensionUpdateBanner(cooling, cooling.dismissedUntil)).toBe(
        level >= 3
      );
    }
  );

  it.each(['', '1.0.1', '1.2.0'])(
    'hides all update hints for unmatched pending %s',
    (version) => {
      const state = {
        ...useExtensionUpdateStore.getState(),
        currentVersion: '1.0.0',
        version,
        versionInfo: makeInfo('1.1.0', 4),
      };
      expect(selectHasNewExtensionVersion(state)).toBe(false);
      expect(selectExtensionUpdateBadge(state)).toBe(false);
      expect(selectExtensionUpdateBanner(state)).toBe(false);
    }
  );

  it.each([
    ['', 1],
    ['1.0.0.1', 1],
    ['1.1.0', 0],
    ['1.2.0', 0],
  ])('checks pending %s against the backend', async (version, count) => {
    broadcast({ currentVersion: '1.0.0', version: version as string });
    (wallet.openapi.getVersionInfo as jest.Mock).mockResolvedValue(makeInfo());
    await useExtensionUpdateStore.getState().refreshVersionInfo();
    expect(wallet.openapi.getVersionInfo).toHaveBeenCalledWith({
      version_id: '1.0.0',
    });
    expect(wallet.requestExtensionUpdateCheck).toHaveBeenCalledTimes(
      count as number
    );
    await useExtensionUpdateStore.persist.flush();
    expect(wallet.setStorageItem).not.toHaveBeenCalled();
  });

  it.each([
    { version: null, latest_version: makeInfo().latest_version },
    { version: makeInfo().version, latest_version: null },
    { version: null, latest_version: null },
  ])(
    'clears hints for nullable version responses without checking Chrome',
    async (response) => {
      const log = jest
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
      try {
        (wallet.openapi.getVersionInfo as jest.Mock).mockResolvedValue(
          response
        );
        await useExtensionUpdateStore.getState().refreshVersionInfo();
        expect(useExtensionUpdateStore.getState().versionInfo).toBeNull();
        expect(wallet.requestExtensionUpdateCheck).not.toHaveBeenCalled();
        expect(log).not.toHaveBeenCalled();
      } finally {
        log.mockRestore();
      }
    }
  );

  it('persists only the cooldown when dismissed', async () => {
    useExtensionUpdateStore.setState({ versionInfo: makeInfo('1.1.0', 3) });
    const before = Date.now();
    useExtensionUpdateStore.getState().dismissBanner();
    await useExtensionUpdateStore.persist.flush();
    expect(
      useExtensionUpdateStore.getState().dismissedUntil
    ).toBeGreaterThanOrEqual(before + UPDATE_BANNER_COOLDOWN);
    expect(wallet.setStorageItem).toHaveBeenCalledWith(
      'pendingExtensionUpdate',
      { dismissedUntil: expect.any(Number) },
      []
    );
  });

  it('does not allow mandatory updates to be dismissed', () => {
    useExtensionUpdateStore.setState({ versionInfo: makeInfo('1.1.0', 4) });
    const until = useExtensionUpdateStore.getState().dismissedUntil;
    useExtensionUpdateStore.getState().dismissBanner();
    expect(useExtensionUpdateStore.getState().dismissedUntil).toBe(until);
  });

  it('clears stale hints on an invalid backend response', async () => {
    const log = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    try {
      (wallet.openapi.getVersionInfo as jest.Mock).mockResolvedValue({
        ...makeInfo(),
        version: { id: '9.0.0', level: 4, changelog: '' },
      });
      await useExtensionUpdateStore.getState().refreshVersionInfo();
      expect(useExtensionUpdateStore.getState().versionInfo).toBeNull();
      expect(wallet.requestExtensionUpdateCheck).not.toHaveBeenCalled();
    } finally {
      log.mockRestore();
    }
  });

  it('restores a full snapshot when the background restarts', async () => {
    (wallet.getStorageSnapshot as jest.Mock).mockResolvedValue({
      origin: 'background-2',
      revision: 0,
      state: { currentVersion: '1.0.0', version: '1.2.0' },
    });
    await act(async () => broadcast({ version: '1.2.0' }, 0, 'background-2'));
    expect(wallet.getStorageSnapshot).toHaveBeenCalledWith(
      'pendingExtensionUpdate'
    );
    expect(useExtensionUpdateStore.getState()).toMatchObject({
      currentVersion: '1.0.0',
      version: '1.2.0',
    });
    expect(wallet.setStorageItem).not.toHaveBeenCalled();
  });
});
