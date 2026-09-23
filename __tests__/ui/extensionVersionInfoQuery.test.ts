import { act, createElement } from 'react';
import { createRoot, Root } from 'react-dom/client';
import {
  focusManager,
  onlineManager,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import browser from 'webextension-polyfill';
import { useExtensionVersionInfo } from '@/ui/hooks/useExtensionVersionInfo';
import { createQueryClient } from '@/ui/query/queryClient';
import { createQueryKey } from '@/ui/query/queryKey';
import { useExtensionUpdateStore } from '@/ui/state/extensionUpdate';
import { wallet } from '@/ui/wallet';
import type { VersionInfo } from '@/utils/extensionVersion';

jest.mock('webextension-polyfill', () => ({
  runtime: {
    getManifest: jest.fn(() => ({ version: '1.0.0' })),
  },
}));

jest.mock('@/ui/wallet', () => ({
  wallet: {
    getStorageSnapshot: jest.fn().mockResolvedValue({
      origin: 'background-1',
      revision: 1,
      state: { pendingVersion: '1.1.0' },
    }),
    setStorageItem: jest.fn(),
    requestExtensionUpdateCheck: jest.fn().mockResolvedValue(undefined),
    openapi: { getVersionInfo: jest.fn() },
  },
  onWalletReconnect: jest.fn(() => () => undefined),
}));

const makeInfo = (latest = '1.1.0', installed = '1.0.0'): VersionInfo => ({
  version: { id: installed, level: 2, changelog: 'Current' },
  latest_version: { id: latest, level: 3, changelog: 'Latest' },
});

const queryKey = (pendingVersion = '1.1.0', versionId = '1.0.0') =>
  createQueryKey('extensionVersionInfo', {}, { versionId, pendingVersion });

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

const VersionInfoProbe = () => {
  useExtensionVersionInfo();
  const latest = useExtensionUpdateStore(
    (state) => state.versionInfo?.latest_version.id
  );
  return createElement('span', null, latest ?? 'No version info');
};

describe('extension version info query', () => {
  let container: HTMLDivElement;
  let root: Root;
  let client: QueryClient;
  let errorLog: jest.SpyInstance;
  const previousActEnvironment = (globalThis as any).IS_REACT_ACT_ENVIRONMENT;

  beforeAll(async () => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    await useExtensionUpdateStore.persist.hydrationPromise();
  });

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-09-18T00:00:00Z'));
    jest.clearAllMocks();
    errorLog = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    (browser.runtime.getManifest as jest.Mock).mockReturnValue({
      version: '1.0.0',
    });
    (wallet.openapi.getVersionInfo as jest.Mock)
      .mockReset()
      .mockResolvedValue(makeInfo());
    (wallet.requestExtensionUpdateCheck as jest.Mock)
      .mockReset()
      .mockResolvedValue(undefined);
    useExtensionUpdateStore.setState({
      pendingVersion: '1.1.0',
      versionInfo: null,
    });
    client = createQueryClient();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    client.clear();
    container.remove();
    focusManager.setFocused(undefined);
    onlineManager.setOnline(true);
    errorLog.mockRestore();
    jest.useRealTimers();
  });

  afterAll(() => {
    useExtensionUpdateStore.persist.destroy();
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
  });

  const render = async (count = 1) => {
    await act(async () => {
      root.render(
        createElement(
          QueryClientProvider,
          { client },
          Array.from({ length: count }, (_, index) =>
            createElement(VersionInfoProbe, { key: index })
          )
        )
      );
    });
  };

  const leaveDashboard = async () => {
    await act(async () => root.render(null));
  };

  const advance = async (milliseconds: number) => {
    await act(async () => jest.advanceTimersByTime(milliseconds));
  };

  it('reuses fresh data on navigation back and refreshes after one minute', async () => {
    await render();
    expect(wallet.openapi.getVersionInfo).toHaveBeenCalledTimes(1);
    expect(container.textContent).toBe('1.1.0');

    await leaveDashboard();
    await advance(59_999);
    await render();
    expect(wallet.openapi.getVersionInfo).toHaveBeenCalledTimes(1);

    await leaveDashboard();
    await advance(2);
    await render();
    expect(wallet.openapi.getVersionInfo).toHaveBeenCalledTimes(2);
  });

  it('does not poll or refetch on focus or reconnect even after becoming stale', async () => {
    await render();
    await advance(5 * 60_000);
    await act(async () => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
      onlineManager.setOnline(false);
      onlineManager.setOnline(true);
      window.dispatchEvent(new Event('focus'));
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(wallet.openapi.getVersionInfo).toHaveBeenCalledTimes(1);
  });

  it('refreshes immediately for a changed pending version and isolates its cache', async () => {
    await render();
    (wallet.openapi.getVersionInfo as jest.Mock).mockResolvedValue(
      makeInfo('1.2.0')
    );
    await act(async () => {
      useExtensionUpdateStore.setState({ pendingVersion: '1.2.0' });
    });

    expect(wallet.openapi.getVersionInfo).toHaveBeenCalledTimes(2);
    expect(client.getQueryData(queryKey('1.1.0'))).toEqual(makeInfo());
    expect(client.getQueryData(queryKey('1.2.0'))).toEqual(makeInfo('1.2.0'));
    expect(container.textContent).toBe('1.2.0');
    expect(wallet.requestExtensionUpdateCheck).not.toHaveBeenCalled();
  });

  it('includes the installed version in the key and request parameters', async () => {
    await render();
    await leaveDashboard();
    (browser.runtime.getManifest as jest.Mock).mockReturnValue({
      version: '1.0.1',
    });
    (wallet.openapi.getVersionInfo as jest.Mock).mockResolvedValue(
      makeInfo('1.1.0', '1.0.1')
    );
    await render();

    expect(wallet.openapi.getVersionInfo).toHaveBeenCalledTimes(2);
    expect(wallet.openapi.getVersionInfo).toHaveBeenLastCalledWith({
      version_id: '1.0.1',
    });
    expect(client.getQueryData(queryKey('1.1.0', '1.0.1'))).toEqual(
      makeInfo('1.1.0', '1.0.1')
    );
  });

  it('deduplicates simultaneous subscribers to the same key', async () => {
    const response = deferred<VersionInfo>();
    (wallet.openapi.getVersionInfo as jest.Mock).mockReturnValue(
      response.promise
    );
    await render(2);
    expect(wallet.openapi.getVersionInfo).toHaveBeenCalledTimes(1);
    await act(async () => response.resolve(makeInfo()));
    expect(container.textContent).toBe('1.1.01.1.0');
  });

  it.each(['network', 'invalid response'])(
    'does not cache %s failures as success and retries on the next mount',
    async (failure) => {
      useExtensionUpdateStore.setState({ versionInfo: makeInfo() });
      if (failure === 'network') {
        (wallet.openapi.getVersionInfo as jest.Mock).mockRejectedValueOnce(
          new Error('Network failed')
        );
      } else {
        (wallet.openapi.getVersionInfo as jest.Mock).mockResolvedValueOnce(
          makeInfo('1.1.0', '9.0.0')
        );
      }
      await render();
      expect(client.getQueryState(queryKey())?.status).toBe('error');
      expect(useExtensionUpdateStore.getState().versionInfo).toBeNull();
      expect(wallet.requestExtensionUpdateCheck).not.toHaveBeenCalled();
      await advance(10_000);
      expect(wallet.openapi.getVersionInfo).toHaveBeenCalledTimes(1);

      await leaveDashboard();
      await render();
      expect(wallet.openapi.getVersionInfo).toHaveBeenCalledTimes(2);
      expect(client.getQueryState(queryKey())?.status).toBe('success');
      expect(container.textContent).toBe('1.1.0');
    }
  );

  it.each([
    { version: null, latest_version: makeInfo().latest_version },
    { version: makeInfo().version, latest_version: null },
    { version: null, latest_version: null },
  ])(
    'caches a valid nullable API response for one minute: %j',
    async (info) => {
      useExtensionUpdateStore.setState({ versionInfo: makeInfo() });
      (wallet.openapi.getVersionInfo as jest.Mock).mockResolvedValue(info);
      await render();
      expect(client.getQueryState(queryKey())?.status).toBe('success');
      expect(client.getQueryData(queryKey())).toBeNull();
      expect(useExtensionUpdateStore.getState().versionInfo).toBeNull();

      await leaveDashboard();
      await advance(59_999);
      await render();
      expect(wallet.openapi.getVersionInfo).toHaveBeenCalledTimes(1);
      expect(wallet.requestExtensionUpdateCheck).not.toHaveBeenCalled();
      expect(errorLog).not.toHaveBeenCalled();
    }
  );

  it.each(['success', 'null', 'error'])(
    'keeps the newest pending result when an older in-flight query finishes with %s',
    async (outcome) => {
      const oldResponse = deferred<unknown>();
      const newResponse = deferred<VersionInfo>();
      (wallet.openapi.getVersionInfo as jest.Mock)
        .mockReturnValueOnce(oldResponse.promise)
        .mockReturnValueOnce(newResponse.promise);
      await render();
      await act(async () => {
        useExtensionUpdateStore.setState({ pendingVersion: '1.2.0' });
      });
      expect(wallet.openapi.getVersionInfo).toHaveBeenCalledTimes(2);

      await act(async () => newResponse.resolve(makeInfo('1.2.0')));
      expect(useExtensionUpdateStore.getState().versionInfo).toEqual(
        makeInfo('1.2.0')
      );
      await act(async () => {
        if (outcome === 'error') {
          oldResponse.reject(new Error('Old request failed'));
        } else if (outcome === 'null') {
          oldResponse.resolve({ version: null, latest_version: null });
        } else {
          oldResponse.resolve(makeInfo());
        }
      });

      expect(useExtensionUpdateStore.getState().versionInfo).toEqual(
        makeInfo('1.2.0')
      );
      expect(container.textContent).toBe('1.2.0');
      expect(wallet.requestExtensionUpdateCheck).not.toHaveBeenCalled();
    }
  );
});
