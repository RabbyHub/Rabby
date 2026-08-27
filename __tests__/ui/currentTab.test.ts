const mockQueryTabs = jest.fn();

jest.mock('webextension-polyfill', () => ({
  __esModule: true,
  default: {
    tabs: {
      query: mockQueryTabs,
    },
  },
}));

import { getCurrentTab } from '@/ui/utils/currentTab';

describe('getCurrentTab', () => {
  beforeEach(() => {
    mockQueryTabs.mockReset();
  });

  it('returns undefined when the current window has no active tab', async () => {
    mockQueryTabs.mockResolvedValue([]);

    await expect(getCurrentTab()).resolves.toBeUndefined();
  });
});
