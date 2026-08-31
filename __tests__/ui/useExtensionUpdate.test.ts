import { act, createElement } from 'react';
import { createRoot, Root } from 'react-dom/client';
import browser from 'webextension-polyfill';
import { useExtensionUpdate } from '@/ui/hooks/useExtensionUpdate';
import { wallet } from '@/ui/wallet';

jest.mock('webextension-polyfill', () => ({
  runtime: {
    onUpdateAvailable: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
    reload: jest.fn(),
    requestUpdateCheck: jest.fn(),
  },
}));

jest.mock('@/ui/wallet', () => ({
  wallet: { getPendingExtensionVersion: jest.fn() },
}));

const getPendingVersion = wallet.getPendingExtensionVersion as jest.Mock;
const addListener = browser.runtime.onUpdateAvailable.addListener as jest.Mock;

const UpdateButton = () => {
  const { hasNewVersion, reloadForUpdate } = useExtensionUpdate();
  return createElement(
    'button',
    { onClick: reloadForUpdate },
    hasNewVersion ? 'Update available' : 'No update'
  );
};

describe('useExtensionUpdate', () => {
  let container: HTMLDivElement;
  let root: Root;
  let unmounted: boolean;
  const previousActEnvironment = (globalThis as any).IS_REACT_ACT_ENVIRONMENT;

  beforeAll(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    getPendingVersion.mockResolvedValue(null);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    unmounted = false;
  });

  afterEach(() => {
    if (!unmounted) act(() => root.unmount());
    container.remove();
  });

  afterAll(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
  });

  const render = async () => {
    await act(async () => {
      root.render(createElement(UpdateButton));
    });
  };

  const click = () => {
    act(() => container.querySelector('button')!.click());
  };

  it('does not check for updates or reload when no update is pending', async () => {
    await render();
    click();

    expect(container.textContent).toBe('No update');
    expect(browser.runtime.requestUpdateCheck).not.toHaveBeenCalled();
    expect(browser.runtime.reload).not.toHaveBeenCalled();
  });

  it('shows a runtime update and only reloads when the user clicks', async () => {
    await render();
    act(() => addListener.mock.calls[0][0]({ version: '1.1.0' }));

    expect(container.textContent).toBe('Update available');
    expect(browser.runtime.reload).not.toHaveBeenCalled();

    click();

    expect(browser.runtime.reload).toHaveBeenCalledTimes(1);
  });

  it('shows an update received before the settings page opened', async () => {
    getPendingVersion.mockResolvedValue('1.1.0');
    await render();

    expect(container.textContent).toBe('Update available');
    click();
    expect(browser.runtime.reload).toHaveBeenCalledTimes(1);
  });

  it('does not clear a live event when an older snapshot returns no update', async () => {
    let resolveRead!: (value: null) => void;
    getPendingVersion.mockReturnValue(
      new Promise((resolve) => {
        resolveRead = resolve;
      })
    );
    await render();
    act(() => addListener.mock.calls[0][0]({ version: '1.1.0' }));
    await act(async () => resolveRead(null));

    expect(container.textContent).toBe('Update available');
  });

  it('removes the listener when settings unmounts', async () => {
    await render();
    const listener = addListener.mock.calls[0][0];
    act(() => root.unmount());
    unmounted = true;

    expect(
      browser.runtime.onUpdateAvailable.removeListener
    ).toHaveBeenCalledWith(listener);
  });

  it('still handles update events if reading the background state fails', async () => {
    const error = new Error('Background unavailable');
    getPendingVersion.mockRejectedValueOnce(error);
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    try {
      await render();
      expect(consoleError).toHaveBeenCalledWith(
        '[extensionUpdate] failed to read update',
        error
      );
      act(() => addListener.mock.calls[0][0]({ version: '1.1.0' }));
      expect(container.textContent).toBe('Update available');
    } finally {
      consoleError.mockRestore();
    }
  });
});
