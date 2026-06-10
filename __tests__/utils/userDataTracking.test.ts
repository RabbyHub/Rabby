/**
 * @jest-environment jsdom
 */
import browser from 'webextension-polyfill';
import { shouldReportUserBehaviorData } from '@/utils/user-data-tracking';

jest.mock('webextension-polyfill', () => ({
  storage: {
    local: {
      get: jest.fn(),
    },
  },
}));

const mockStorageGet = browser.storage.local.get as jest.Mock;

describe('shouldReportUserBehaviorData', () => {
  beforeEach(() => {
    mockStorageGet.mockReset();
  });

  test('returns false when preference is not created yet', async () => {
    mockStorageGet.mockResolvedValue({});

    await expect(shouldReportUserBehaviorData()).resolves.toBe(false);
  });

  test('returns false when user opted out', async () => {
    mockStorageGet.mockResolvedValue({
      preference: {
        userDataTrackingOptOut: true,
      },
    });

    await expect(shouldReportUserBehaviorData()).resolves.toBe(false);
  });

  test('returns true when user did not opt out', async () => {
    mockStorageGet.mockResolvedValue({
      preference: {
        userDataTrackingOptOut: false,
      },
    });

    await expect(shouldReportUserBehaviorData()).resolves.toBe(true);
  });

  test('treats missing field on existing preference as an old user', async () => {
    mockStorageGet.mockResolvedValue({
      preference: {
        currentVersion: '0.93.92',
      },
    });

    await expect(shouldReportUserBehaviorData()).resolves.toBe(true);
  });

  test('returns false when storage access fails', async () => {
    mockStorageGet.mockRejectedValue(new Error('storage unavailable'));

    await expect(shouldReportUserBehaviorData()).resolves.toBe(false);
  });
});
