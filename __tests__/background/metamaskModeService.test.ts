const mockCreatePersistStore = jest.fn();
const mockGet = jest.fn();

jest.mock('@/utils/env', () => ({ isManifestV3: false }));
jest.mock('webextension-polyfill', () => ({}));
jest.mock('@/background/utils', () => ({
  createPersistStore: (...args: unknown[]) => mockCreatePersistStore(...args),
}));
jest.mock('@/background/utils/alarms', () => ({
  ALARMS_SYNC_METAMASK_DAPPS: 'ALARMS_SYNC_METAMASK_DAPPS',
}));
jest.mock('@/background/utils/http', () => ({
  http: { get: (...args: unknown[]) => mockGet(...args) },
}));
jest.mock('@/background/service/permission', () => ({
  __esModule: true,
  default: { getMetamaskModeSites: () => [] },
}));

import { metamaskModeService } from '@/background/service/metamaskModeService';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('metamaskModeService site list', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockGet.mockReset();
    metamaskModeService.store = { sites: [], updatedAt: 0 };
  });

  afterEach(() => {
    if (metamaskModeService.timer) clearInterval(metamaskModeService.timer);
    metamaskModeService.timer = null;
    jest.restoreAllMocks();
  });

  it.each([null, {}, 42, ['ok.example', 1]])(
    'resets a persisted list of %p and refetches right away',
    async (sites) => {
      mockCreatePersistStore.mockResolvedValue({
        sites,
        updatedAt: Date.now(),
      });
      mockGet.mockResolvedValue({ data: ['dapp.example'] });

      await metamaskModeService.init();
      expect(() =>
        metamaskModeService.checkIsMetamaskMode('https://x.example')
      ).not.toThrow();

      await flush();
      expect(mockGet).toHaveBeenCalledTimes(1);
      expect(
        metamaskModeService.checkIsMetamaskMode('https://dapp.example')
      ).toBe(true);
    }
  );

  it('keeps the previous list when the response is not a list of sites', async () => {
    metamaskModeService.store = { sites: ['dapp.example'], updatedAt: 0 };
    mockGet.mockResolvedValue({ data: { error: 'blocked' } });

    await metamaskModeService.syncMetamaskModeList();

    expect(metamaskModeService.store.sites).toEqual(['dapp.example']);
    expect(metamaskModeService.store.updatedAt).toBe(0);
    expect(
      metamaskModeService.checkIsMetamaskMode('https://dapp.example')
    ).toBe(true);
  });
});
