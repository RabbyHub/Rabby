const mockQuery = jest.fn();
const mockSendMessage = jest.fn();

jest.mock('webextension-polyfill', () => ({
  __esModule: true,
  default: {
    tabs: {
      query: (...args: unknown[]) => mockQuery(...args),
      sendMessage: (...args: unknown[]) => mockSendMessage(...args),
    },
  },
}));

jest.mock('@/utils/message/broadcastChannelMessage', () => ({
  __esModule: true,
  default: class {},
}));
jest.mock('@/utils/message/portMessage', () => ({
  __esModule: true,
  default: class {},
}));
jest.mock('@sentry/browser', () => ({}));

import { EXTENSION_MESSAGES } from '@/constant/message';
import { sendReadyMessageToTabs } from '@/utils/message';

describe('sendReadyMessageToTabs', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockSendMessage.mockReset();
    mockSendMessage.mockResolvedValue(undefined);
  });

  test.each(['app', 'popup'])(
    'notifies injectable tabs in %s windows as well as normal windows',
    async (windowType) => {
      // Model tabs.query's windowType filter. This tests the notification helper;
      // the fixture does not establish how a particular browser classifies PWAs.
      const injectableTabs = [
        { id: 11, windowType: 'normal' },
        { id: 22, windowType },
      ];
      mockQuery.mockImplementation(async ({ windowType }) =>
        injectableTabs.filter(
          (tab) => windowType === undefined || tab.windowType === windowType
        )
      );

      await sendReadyMessageToTabs();

      expect(mockSendMessage).toHaveBeenCalledWith(22, {
        name: EXTENSION_MESSAGES.READY,
      });
      expect(mockSendMessage).toHaveBeenCalledWith(11, {
        name: EXTENSION_MESSAGES.READY,
      });
      expect(mockSendMessage).toHaveBeenCalledTimes(2);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.objectContaining({ url: '<all_urls>' })
      );
    }
  );

  test('skips missing tab ids while preserving a valid zero id', async () => {
    mockQuery.mockResolvedValue([{ id: null }, {}, { id: 0 }]);

    await sendReadyMessageToTabs();

    expect(mockSendMessage).toHaveBeenCalledTimes(1);
    expect(mockSendMessage).toHaveBeenCalledWith(0, {
      name: EXTENSION_MESSAGES.READY,
    });
  });

  test('continues notifying other tabs when one has no receiving content script', async () => {
    mockQuery.mockResolvedValue([{ id: 11 }, { id: 22 }]);
    mockSendMessage.mockRejectedValueOnce(
      new Error('Could not establish connection. Receiving end does not exist.')
    );

    await expect(sendReadyMessageToTabs()).resolves.toBeUndefined();
    await Promise.resolve();

    expect(mockSendMessage.mock.calls).toEqual([
      [11, { name: EXTENSION_MESSAGES.READY }],
      [22, { name: EXTENSION_MESSAGES.READY }],
    ]);
  });

  test('keeps a failed tabs query observable to the caller', async () => {
    const error = new Error('Tabs query failed');
    mockQuery.mockRejectedValue(error);
    const consoleError = jest.spyOn(console, 'error').mockImplementation();

    try {
      await expect(sendReadyMessageToTabs()).rejects.toBe(error);
      expect(mockSendMessage).not.toHaveBeenCalled();
      expect(consoleError).toHaveBeenCalledWith(error);
    } finally {
      consoleError.mockRestore();
    }
  });

  test('does not send notifications when there are no injectable tabs', async () => {
    mockQuery.mockResolvedValue([]);

    await sendReadyMessageToTabs();

    expect(mockSendMessage).not.toHaveBeenCalled();
  });
});
