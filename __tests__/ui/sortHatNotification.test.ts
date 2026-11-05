import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import SortHat from '@/ui/views/SortHat';

const mockGetApproval = jest.fn();
const mockGetCurrentWindow = jest.fn();
const mockRuntimeSendMessage = jest.fn();
const mockWallet = {
  closeNotificationWindow: jest.fn(),
  isBooted: jest.fn(),
  tryUnlock: jest.fn(),
  hasPageStateCache: jest.fn(),
  getCurrentAccount: jest.fn(),
};
let mockUiType = { isNotification: true, isTab: false, isPop: false };

jest.mock('ui/utils', () => ({
  getUiType: () => mockUiType,
  useApproval: () => [mockGetApproval],
  useWallet: () => mockWallet,
}));
jest.mock('ui/component', () => ({
  Spin: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('react-router-dom', () => ({
  Redirect: ({ to }: { to: string }) =>
    React.createElement('div', { 'data-route': to }, to),
}));
jest.mock('webextension-polyfill', () => ({
  __esModule: true,
  default: {
    windows: {
      getCurrent: (...args: unknown[]) => mockGetCurrentWindow(...args),
    },
    runtime: {
      sendMessage: (...args: unknown[]) => mockRuntimeSendMessage(...args),
    },
  },
}));

describe('SortHat notification window lifecycle', () => {
  let root: Root;
  let container: HTMLDivElement;
  let closeWindow: jest.SpyInstance;
  const nextApproval = {
    id: 'second-signature',
    data: { approvalComponent: 'SignTx' },
  };

  const render = async () => {
    await act(async () => {
      root.render(React.createElement(SortHat));
    });
  };

  beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers();
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    root = createRoot(container);
    closeWindow = jest
      .spyOn(window, 'close')
      .mockImplementation(() => undefined);
    mockUiType = { isNotification: true, isTab: false, isPop: false };
    mockGetApproval.mockResolvedValue(null);
    mockGetCurrentWindow.mockResolvedValue({ id: 73 });
    mockWallet.closeNotificationWindow.mockResolvedValue(true);
    mockWallet.isBooted.mockResolvedValue(true);
    mockWallet.tryUnlock.mockResolvedValue(true);
    mockWallet.hasPageStateCache.mockResolvedValue(false);
    mockWallet.getCurrentAccount.mockResolvedValue({ address: '0xaccount' });
  });

  afterEach(() => {
    act(() => root.unmount());
    jest.runOnlyPendingTimers();
    closeWindow.mockRestore();
    delete (globalThis as any).IS_REACT_ACT_ENVIRONMENT;
    jest.useRealTimers();
  });

  test('reloads a new approval when the empty snapshot is stale at close time', async () => {
    let finishClose!: (closed: boolean) => void;
    mockGetApproval
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(nextApproval);
    mockWallet.closeNotificationWindow.mockImplementationOnce(
      () =>
        new Promise<boolean>((resolve) => {
          finishClose = resolve;
        })
    );

    await render();

    expect(mockWallet.closeNotificationWindow).toHaveBeenCalledWith(73);
    expect(mockGetApproval).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[data-route]')).toBeNull();
    expect(closeWindow).not.toHaveBeenCalled();

    await act(async () => {
      finishClose(false);
    });

    expect(mockGetApproval).toHaveBeenCalledTimes(2);
    expect(
      container.querySelector('[data-route]')?.getAttribute('data-route')
    ).toBe('/approval');
    expect(mockWallet.closeNotificationWindow).toHaveBeenCalledTimes(1);
    expect(mockRuntimeSendMessage).not.toHaveBeenCalled();
    expect(closeWindow).not.toHaveBeenCalled();
  });

  test('only self-closes after the background confirms the window is safe to close', async () => {
    let finishClose!: (closed: boolean) => void;
    mockWallet.closeNotificationWindow.mockImplementationOnce(
      () =>
        new Promise<boolean>((resolve) => {
          finishClose = resolve;
        })
    );

    await render();

    expect(mockWallet.closeNotificationWindow).toHaveBeenCalledWith(73);
    expect(closeWindow).not.toHaveBeenCalled();
    expect(mockRuntimeSendMessage).not.toHaveBeenCalled();
    expect(container.querySelector('[data-route]')).toBeNull();

    await act(async () => {
      finishClose(true);
    });

    expect(mockGetApproval).toHaveBeenCalledTimes(1);
    expect(mockWallet.tryUnlock).not.toHaveBeenCalled();
    expect(container.querySelector('[data-route]')).toBeNull();
    expect(closeWindow).toHaveBeenCalledTimes(1);
    expect(mockRuntimeSendMessage).not.toHaveBeenCalled();
  });

  test('passes its own browser window ID to the background close request', async () => {
    mockGetCurrentWindow.mockResolvedValue({ id: 204 });

    await render();

    expect(mockGetCurrentWindow).toHaveBeenCalledTimes(1);
    expect(mockWallet.closeNotificationWindow).toHaveBeenCalledWith(204);
    expect(mockWallet.closeNotificationWindow).toHaveBeenCalledTimes(1);
  });

  test('does not close when its browser window ID is unavailable', async () => {
    mockGetCurrentWindow.mockResolvedValue({});

    await render();

    expect(mockGetCurrentWindow).toHaveBeenCalledTimes(1);
    expect(mockWallet.closeNotificationWindow).not.toHaveBeenCalled();
    expect(closeWindow).not.toHaveBeenCalled();
    expect(mockRuntimeSendMessage).not.toHaveBeenCalled();
    expect(container.querySelector('[data-route]')).toBeNull();
  });

  test.each([
    { label: 'popup', isTab: false, isPop: true },
    { label: 'tab', isTab: true, isPop: false },
  ])(
    'does not close a $label with no pending approval',
    async ({ isTab, isPop }) => {
      mockUiType = { isNotification: false, isTab, isPop };

      await render();

      expect(
        container.querySelector('[data-route]')?.getAttribute('data-route')
      ).toBe('/dashboard');
      expect(mockGetCurrentWindow).not.toHaveBeenCalled();
      expect(mockWallet.closeNotificationWindow).not.toHaveBeenCalled();
      expect(mockRuntimeSendMessage).not.toHaveBeenCalled();
      expect(closeWindow).not.toHaveBeenCalled();
    }
  );

  test('routes an existing notification approval without requesting a close', async () => {
    mockGetApproval.mockResolvedValue(nextApproval);

    await render();

    expect(
      container.querySelector('[data-route]')?.getAttribute('data-route')
    ).toBe('/approval');
    expect(mockGetCurrentWindow).not.toHaveBeenCalled();
    expect(mockWallet.closeNotificationWindow).not.toHaveBeenCalled();
    expect(closeWindow).not.toHaveBeenCalled();
  });
});
