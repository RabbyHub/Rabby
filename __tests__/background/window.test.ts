const mockGetLastFocused = jest.fn();
const mockCreateWindow = jest.fn();
const mockUpdateWindow = jest.fn();
const mockRemoveWindow = jest.fn();
const mockOnRemoved = jest.fn();
const mockRuntimeOnMessage = jest.fn();

jest.mock('webextension-polyfill', () => ({
  __esModule: true,
  default: {
    windows: {
      getLastFocused: mockGetLastFocused,
      create: mockCreateWindow,
      update: mockUpdateWindow,
      remove: mockRemoveWindow,
      onFocusChanged: { addListener: jest.fn() },
      onRemoved: { addListener: mockOnRemoved },
    },
    runtime: {
      onMessage: { addListener: mockRuntimeOnMessage },
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

const emitRemoved = (windowId: number) =>
  mockOnRemoved.mock.calls[0][0](windowId);

describe('background window manager', () => {
  const onWindowRemoved = jest.fn();

  beforeEach(() => {
    mockGetLastFocused.mockReset();
    mockCreateWindow.mockReset();
    mockUpdateWindow.mockReset();
    mockRemoveWindow.mockReset().mockResolvedValue(undefined);
    onWindowRemoved.mockReset();
    winMgr.event.on('windowRemoved', onWindowRemoved);
  });

  afterEach(() => {
    winMgr.event.removeListener('windowRemoved', onWindowRemoved);
  });

  it('returns undefined when the browser does not create a window', async () => {
    mockGetLastFocused
      .mockResolvedValueOnce({ top: 0, left: 0, width: 1200, height: 800 })
      .mockResolvedValueOnce({ state: 'normal' });
    mockCreateWindow.mockResolvedValueOnce(null);

    await expect(winMgr.openNotification()).resolves.toBeUndefined();
    expect(mockUpdateWindow).not.toHaveBeenCalled();
  });

  it('keeps manual closure of another window independent from a pending programmatic close', async () => {
    let finishRemoval!: () => void;
    mockRemoveWindow.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        finishRemoval = resolve;
      })
    );
    const removal = winMgr.remove(10);

    emitRemoved(20);
    emitRemoved(10);
    finishRemoval();
    await removal;

    expect(onWindowRemoved.mock.calls).toEqual([
      [20, true],
      [10, false],
    ]);
  });

  it('classifies overlapping programmatic closes by id when removal events arrive out of order', async () => {
    await Promise.all([winMgr.remove(11), winMgr.remove(12)]);

    emitRemoved(12);
    emitRemoved(99);
    emitRemoved(11);

    expect(onWindowRemoved.mock.calls).toEqual([
      [12, false],
      [99, true],
      [11, false],
    ]);
  });

  it('does not classify a later manual close as programmatic after browser removal failed', async () => {
    const error = new Error('browser could not remove window');
    mockRemoveWindow.mockRejectedValueOnce(error);

    await expect(winMgr.remove(13)).rejects.toBe(error);
    emitRemoved(13);

    expect(onWindowRemoved).toHaveBeenCalledWith(13, true);
  });

  it('ignores legacy unscoped close messages', () => {
    const onCloseNotification = jest.fn();
    winMgr.event.on('closeNotification', onCloseNotification);
    try {
      mockRuntimeOnMessage.mock.calls.forEach(([listener]) => {
        listener({ type: 'closeNotification' });
      });
      emitRemoved(14);

      expect(onCloseNotification).not.toHaveBeenCalled();
      expect(onWindowRemoved).toHaveBeenCalledWith(14, true);
    } finally {
      winMgr.event.removeListener('closeNotification', onCloseNotification);
    }
  });
});
