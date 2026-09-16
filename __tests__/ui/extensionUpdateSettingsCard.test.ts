import { act, createElement } from 'react';
import { createRoot, Root } from 'react-dom/client';
import browser from 'webextension-polyfill';
import eventBus from '@/eventBus';
import type { ExtensionUpdateStore as ServiceStore } from '@/background/service/extensionUpdate';
import {
  selectExtensionUpdateSettingsCard,
  selectExtensionUpdateBanner,
  useExtensionUpdateStore,
} from '@/ui/state/extensionUpdate';
import { useExtensionUpdateSettingsCard } from '@/ui/hooks/useExtensionUpdateSettingsCard';
import { ExtensionUpdateCard } from '@/ui/views/Dashboard/components/Settings/components/ExtensionUpdateCard';
import { ExtensionUpdateBanner } from '@/ui/views/Dashboard/components/ExtensionUpdateBanner';
import { wallet } from '@/ui/wallet';
import { BROADCAST_TO_UI_EVENTS } from '@/utils/broadcastToUI';
import { UPDATE_SETTINGS_CARD_COOLDOWN } from '@/utils/extensionVersion';

jest.mock('webextension-polyfill', () => ({
  runtime: { getManifest: jest.fn(() => ({ version: '1.0.0' })) },
}));
jest.mock('@/ui/wallet', () => ({
  wallet: {
    getStorageSnapshot: jest.fn().mockResolvedValue({
      origin: 'background-1',
      revision: 1,
      state: {
        pendingVersion: '1.1.0',
        dismissedUntil: 0,
        settingsCardDismissal: null,
      },
    }),
    setStorageItem: jest.fn().mockResolvedValue(undefined),
  },
  onWalletReconnect: jest.fn(() => () => undefined),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key.split('.').pop() }),
}));
jest.mock('antd', () => ({
  message: { error: jest.fn() },
  Button: ({ disabled, loading, onClick, children, className }: any) =>
    jest
      .requireActual('react')
      .createElement(
        'button',
        { disabled: disabled || loading, onClick, className },
        children
      ),
}));

const makeInfo = (level: 1 | 2 | 3 | 4, version = '1.1.0') => ({
  version: { id: '1.0.0', level: 2 as const, changelog: '' },
  latest_version: { id: version, level, changelog: '' },
});
let origin = 'background-1';
let revision = 1;
const broadcast = (
  partials: Partial<ServiceStore>,
  nextRevision = ++revision
) =>
  eventBus.emit(BROADCAST_TO_UI_EVENTS.storeChanged, {
    bgStoreName: 'pendingExtensionUpdate',
    changedKey: Object.keys(partials)[0],
    changedKeys: Object.keys(partials),
    partials,
    origin,
    revision: nextRevision,
  });

const SettingsCard = () => {
  const visible = useExtensionUpdateSettingsCard();
  const version = useExtensionUpdateStore((s) => s.pendingVersion);
  const onClose = useExtensionUpdateStore((s) => s.dismissSettingsCard);
  return visible
    ? createElement(ExtensionUpdateCard, {
        version,
        changelog: '',
        onClose,
        onUpdate: async () => undefined,
      })
    : createElement('div', { className: 'rating' }, 'Rating');
};

describe('settings update card dismissal', () => {
  let root: Root;
  let container: HTMLDivElement;
  const previousActEnvironment = (globalThis as any).IS_REACT_ACT_ENVIRONMENT;
  const state = () => useExtensionUpdateStore.getState();
  const shown = (now?: number) =>
    selectExtensionUpdateSettingsCard(state(), now);

  beforeAll(async () => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    await useExtensionUpdateStore.persist.hydrationPromise();
  });
  beforeEach(async () => {
    await useExtensionUpdateStore.persist.flush();
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-09-16T00:00:00Z'));
    (browser.runtime.getManifest as jest.Mock).mockReturnValue({
      version: '1.0.0',
    });
    broadcast({
      pendingVersion: '1.1.0',
      dismissedUntil: 0,
      settingsCardDismissal: null,
    });
    useExtensionUpdateStore.setState({ versionInfo: makeInfo(3) });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    act(() => root.unmount());
    container.remove();
    await useExtensionUpdateStore.persist.flush();
    jest.useRealTimers();
  });
  afterAll(() => {
    useExtensionUpdateStore.persist.destroy();
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
  });
  const render = () => act(() => root.render(createElement(SettingsCard)));
  const close = () =>
    act(() =>
      container
        .querySelector<HTMLButtonElement>('.extension-update-card-close')!
        .click()
    );

  it.each([1, 2] as const)(
    'keeps level %s dismissed across reopening and time',
    async (level) => {
      useExtensionUpdateStore.setState({ versionInfo: makeInfo(level) });
      render();
      close();
      expect(shown()).toBe(false);
      expect(container.querySelector('.rating')).not.toBeNull();
      act(() => root.render(null));
      jest.advanceTimersByTime(30 * 24 * 60 * 60 * 1000);
      render();
      expect(container.querySelector('.extension-update-card')).toBeNull();
      expect(shown()).toBe(false);
      useExtensionUpdateStore.getState().revealSettingsCard();
      expect(shown()).toBe(false);
      await useExtensionUpdateStore.persist.flush();
      expect(wallet.setStorageItem).toHaveBeenCalledTimes(1);
      expect(wallet.setStorageItem).toHaveBeenCalledWith(
        'pendingExtensionUpdate',
        {
          settingsCardDismissal: {
            currentVersion: '1.0.0',
            pendingVersion: '1.1.0',
            level,
            dismissedUntil: 0,
          },
        },
        []
      );
    }
  );

  it.each([1, 2] as const)(
    'retains a level %s dismissal at levels 1/2 but shows at levels 3/4',
    (level) => {
      useExtensionUpdateStore.setState({ versionInfo: makeInfo(level) });
      state().dismissSettingsCard();
      for (const nextLevel of [1, 2, 3, 4] as const) {
        useExtensionUpdateStore.setState({ versionInfo: makeInfo(nextLevel) });
        expect(shown()).toBe(nextLevel >= 3);
      }
    }
  );

  it.each([1, 2, 3] as const)(
    'shows a newer pending release after dismissing level %s',
    (level) => {
      useExtensionUpdateStore.setState({ versionInfo: makeInfo(level) });
      state().dismissSettingsCard();
      expect(shown()).toBe(false);
      useExtensionUpdateStore.setState({
        versionInfo: makeInfo(level, '1.2.0'),
      });
      expect(shown()).toBe(false);
      broadcast({ pendingVersion: '1.2.0' });
      expect(shown()).toBe(true);
    }
  );

  it('ignores a dismissal made on a different installed version', () => {
    useExtensionUpdateStore.setState({ versionInfo: makeInfo(1) });
    state().dismissSettingsCard();
    (browser.runtime.getManifest as jest.Mock).mockReturnValue({
      version: '1.0.1',
    });
    const info = makeInfo(1);
    info.version.id = '1.0.1';
    useExtensionUpdateStore.setState({ versionInfo: info });
    expect(shown()).toBe(true);
  });

  it('shows level 3 again after the 1-minute test cooldown, even while settings stays open', () => {
    expect(UPDATE_SETTINGS_CARD_COOLDOWN).toBe(60 * 1000);
    render();
    close();
    const deadline = Date.now() + UPDATE_SETTINGS_CARD_COOLDOWN;
    expect(state().settingsCardDismissal?.dismissedUntil).toBe(deadline);
    expect(state().dismissedUntil).toBe(0);
    expect(selectExtensionUpdateBanner(state())).toBe(true);
    act(() => jest.advanceTimersByTime(UPDATE_SETTINGS_CARD_COOLDOWN - 1));
    expect(container.querySelector('.extension-update-card')).toBeNull();
    act(() => jest.advanceTimersByTime(1));
    expect(container.querySelector('.extension-update-card')).not.toBeNull();
    expect(container.querySelector('.rating')).toBeNull();
  });

  it('home Check reveals level 3 immediately and closing it starts a fresh cooldown', async () => {
    state().dismissSettingsCard();
    const firstDeadline = state().settingsCardDismissal!.dismissedUntil;
    jest.advanceTimersByTime(1000);
    act(() =>
      root.render(
        createElement(
          'div',
          null,
          createElement(ExtensionUpdateBanner, {
            visible: true,
            closable: true,
            onDismiss: state().dismissBanner,
            onCheck: state().revealSettingsCard,
          }),
          createElement(SettingsCard)
        )
      )
    );
    expect(container.querySelector('.extension-update-card')).toBeNull();
    act(() =>
      container
        .querySelector<HTMLButtonElement>('.extension-update-banner-check')!
        .click()
    );
    expect(container.querySelector('.extension-update-card')).not.toBeNull();
    expect(state().settingsCardDismissal).toBeNull();
    expect(state().dismissedUntil).toBe(0);
    close();
    expect(state().settingsCardDismissal!.dismissedUntil).toBe(
      firstDeadline + 1000
    );
    await useExtensionUpdateStore.persist.flush();
    expect(wallet.setStorageItem).toHaveBeenCalledWith(
      'pendingExtensionUpdate',
      { settingsCardDismissal: null },
      []
    );
  });

  it('keeps the level 3 cooldown when settings reopens and cleans up its timer', () => {
    render();
    close();
    act(() => root.render(null));
    expect(jest.getTimerCount()).toBe(0);
    jest.advanceTimersByTime(UPDATE_SETTINGS_CARD_COOLDOWN / 2);
    render();
    expect(container.querySelector('.extension-update-card')).toBeNull();
    act(() => jest.advanceTimersByTime(UPDATE_SETTINGS_CARD_COOLDOWN / 2));
    expect(container.querySelector('.extension-update-card')).not.toBeNull();
  });

  it('cannot show or dismiss a card until the pending version matches the latest release', async () => {
    broadcast({ pendingVersion: '1.0.1' });
    expect(shown()).toBe(false);
    state().dismissSettingsCard();
    state().revealSettingsCard();
    expect(state().settingsCardDismissal).toBeNull();
    await useExtensionUpdateStore.persist.flush();
    expect(wallet.setStorageItem).not.toHaveBeenCalled();
  });

  it('always shows level 4 without a close button regardless of older dismissals', async () => {
    state().dismissSettingsCard();
    await useExtensionUpdateStore.persist.flush();
    jest.clearAllMocks();
    useExtensionUpdateStore.setState({ versionInfo: makeInfo(4) });
    render();
    expect(container.querySelector('.extension-update-card')).not.toBeNull();
    expect(container.querySelector('.extension-update-card-close')).toBeNull();
    state().dismissSettingsCard();
    expect(shown()).toBe(true);
    await useExtensionUpdateStore.persist.flush();
    expect(wallet.setStorageItem).not.toHaveBeenCalled();
  });

  it('also honors mandatory level 4 from the installed-version policy', () => {
    state().dismissSettingsCard();
    useExtensionUpdateStore.setState({
      versionInfo: {
        ...makeInfo(1),
        version: { id: '1.0.0', level: 4, changelog: '' },
      },
    });
    expect(shown()).toBe(true);
    const previous = state().settingsCardDismissal;
    state().dismissSettingsCard();
    expect(state().settingsCardDismissal).toBe(previous);
  });

  it('refreshes the card on focus after the device clock passes the cooldown', () => {
    render();
    close();
    jest.setSystemTime(Date.now() + UPDATE_SETTINGS_CARD_COOLDOWN);
    act(() => window.dispatchEvent(new Event('focus')));
    expect(container.querySelector('.extension-update-card')).not.toBeNull();
  });

  it('applies dismissal and Check broadcasts to all subscribers without writing back', async () => {
    act(() =>
      root.render(
        createElement(
          'div',
          null,
          createElement(SettingsCard),
          createElement(SettingsCard)
        )
      )
    );
    expect(container.querySelectorAll('.extension-update-card')).toHaveLength(
      2
    );
    act(() =>
      broadcast({
        settingsCardDismissal: {
          currentVersion: '1.0.0',
          pendingVersion: '1.1.0',
          level: 3,
          dismissedUntil: Date.now() + UPDATE_SETTINGS_CARD_COOLDOWN,
        },
      })
    );
    expect(container.querySelectorAll('.extension-update-card')).toHaveLength(
      0
    );
    act(() => broadcast({ settingsCardDismissal: null }, revision - 1));
    expect(container.querySelectorAll('.extension-update-card')).toHaveLength(
      0
    );
    act(() => broadcast({ settingsCardDismissal: null }));
    expect(container.querySelectorAll('.extension-update-card')).toHaveLength(
      2
    );
    await useExtensionUpdateStore.persist.flush();
    expect(wallet.setStorageItem).not.toHaveBeenCalled();
  });

  it('rolls back a rejected dismissal to the authoritative background state', async () => {
    const error = new Error('Write failed');
    const log = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    (wallet.getStorageSnapshot as jest.Mock).mockResolvedValueOnce({
      origin,
      revision,
      state: {
        pendingVersion: '1.1.0',
        dismissedUntil: 0,
        settingsCardDismissal: null,
      },
    });
    (wallet.setStorageItem as jest.Mock).mockRejectedValueOnce(error);
    try {
      state().dismissSettingsCard();
      expect(shown()).toBe(false);
      await expect(useExtensionUpdateStore.persist.flush()).rejects.toThrow(
        error
      );
      expect(state().settingsCardDismissal).toBeNull();
      expect(shown()).toBe(true);
    } finally {
      log.mockRestore();
    }
  });

  it('restores persisted card dismissal after a background restart', async () => {
    const dismissal = {
      currentVersion: '1.0.0',
      pendingVersion: '1.1.0',
      level: 2 as const,
      dismissedUntil: 0,
    };
    origin = 'background-2';
    revision = 0;
    (wallet.getStorageSnapshot as jest.Mock).mockResolvedValueOnce({
      origin,
      revision,
      state: {
        pendingVersion: '1.1.0',
        dismissedUntil: 0,
        settingsCardDismissal: dismissal,
      },
    });
    useExtensionUpdateStore.setState({ versionInfo: makeInfo(2) });
    await act(async () => broadcast({ settingsCardDismissal: dismissal }, 0));
    expect(state().settingsCardDismissal).toEqual(dismissal);
    expect(shown()).toBe(false);
    expect(wallet.setStorageItem).not.toHaveBeenCalled();
  });
});
