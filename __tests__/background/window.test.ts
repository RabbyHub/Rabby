const mockGetLastFocused = jest.fn();
const mockCreateWindow = jest.fn();
const mockUpdateWindow = jest.fn();

jest.mock('webextension-polyfill', () => ({
  __esModule: true,
  default: {
    windows: {
      getLastFocused: mockGetLastFocused,
      create: mockCreateWindow,
      update: mockUpdateWindow,
      remove: jest.fn(),
      onFocusChanged: { addListener: jest.fn() },
      onRemoved: { addListener: jest.fn() },
    },
    runtime: {
      onMessage: { addListener: jest.fn() },
    },
  },
}));

jest.mock('consts', () => ({
  IS_WINDOWS: false,
}));

jest.mock('@sentry/browser', () => ({
  captureException: jest.fn(),
}));

import winMgr from '@/background/webapi/window';

describe('background window manager', () => {
  beforeEach(() => {
    mockGetLastFocused.mockReset();
    mockCreateWindow.mockReset();
    mockUpdateWindow.mockReset();
  });

  it('returns undefined when the browser does not create a window', async () => {
    mockGetLastFocused
      .mockResolvedValueOnce({ top: 0, left: 0, width: 1200, height: 800 })
      .mockResolvedValueOnce({ state: 'normal' });
    mockCreateWindow.mockResolvedValueOnce(null);

    await expect(winMgr.openNotification()).resolves.toBeUndefined();
    expect(mockUpdateWindow).not.toHaveBeenCalled();
  });

  it('retries invalid bounds without a position', async () => {
    mockGetLastFocused
      .mockResolvedValueOnce({ top: 0, left: 0, width: 1200, height: 800 })
      .mockResolvedValueOnce({ state: 'normal' });
    mockCreateWindow
      .mockRejectedValueOnce(
        new Error(
          'Invalid value for bounds. Bounds must be at least 50% within visible screen space.'
        )
      )
      .mockResolvedValueOnce({ id: 42, left: 0 });

    await expect(winMgr.openNotification()).resolves.toBe(42);
    expect(mockCreateWindow.mock.calls[1][0]).not.toHaveProperty('top');
    expect(mockCreateWindow.mock.calls[1][0]).not.toHaveProperty('left');
  });
});
