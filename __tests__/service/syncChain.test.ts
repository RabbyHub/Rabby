jest.mock('@/constant', () => ({
  CHAINS: { ETH: { hex: '0x1', network: '1' } },
  CHAINS_ENUM: { ETH: 'ETH' },
}));

jest.mock('@/utils/chain', () => ({
  supportedChainToChain: jest.fn((item) => item),
  updateChainStore: jest.fn(),
}));

jest.mock('@/utils/env', () => ({ isManifestV3: true }));
jest.mock('@/background/utils', () => ({ createPersistStore: jest.fn() }));
jest.mock('@/background/utils/http', () => ({ http: { get: jest.fn() } }));

jest.mock('@/background/service', () => ({
  openapiService: {},
  permissionService: { resetSitesWithUnsupportedChain: jest.fn() },
  sessionService: { broadcastEvent: jest.fn() },
}));

jest.mock('webextension-polyfill', () => ({
  __esModule: true,
  default: { storage: { local: { set: jest.fn() } } },
}));

import browser from 'webextension-polyfill';
import { permissionService, sessionService } from '@/background/service';
import { syncChainService } from '@/background/service/syncChain';
import { http } from '@/background/utils/http';
import { updateChainStore } from '@/utils/chain';

const mockChainList = (list: { enum: string; is_disabled?: boolean }[]) => {
  jest.mocked(http.get).mockResolvedValue({ data: list });
};

describe('syncChainService.syncMainnetChainList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest
      .mocked(permissionService.resetSitesWithUnsupportedChain)
      .mockReturnValue([]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('drops a chain list without ETH', async () => {
    mockChainList([{ enum: 'BSC' }, { enum: 'ETH', is_disabled: true }]);

    await syncChainService.syncMainnetChainList({ force: true });

    expect(updateChainStore).not.toHaveBeenCalled();
    expect(browser.storage.local.set).not.toHaveBeenCalled();
    expect(
      permissionService.resetSitesWithUnsupportedChain
    ).not.toHaveBeenCalled();
  });

  it('disconnects and notifies the dapps whose chain was removed', async () => {
    mockChainList([{ enum: 'ETH' }]);
    jest
      .mocked(permissionService.resetSitesWithUnsupportedChain)
      .mockReturnValue([
        { origin: 'https://a.com', isConnected: true },
        { origin: 'https://b.com', isConnected: false },
      ] as ReturnType<typeof permissionService.resetSitesWithUnsupportedChain>);

    await syncChainService.syncMainnetChainList({ force: true });

    expect(updateChainStore).toHaveBeenCalledWith({
      mainnetList: [{ enum: 'ETH' }],
    });
    expect(sessionService.broadcastEvent).toHaveBeenCalledTimes(2);
    expect(sessionService.broadcastEvent).toHaveBeenCalledWith(
      'accountsChanged',
      [],
      'https://a.com',
      true
    );
    expect(sessionService.broadcastEvent).toHaveBeenCalledWith(
      'chainChanged',
      { chain: '0x1', networkVersion: '1' },
      'https://a.com',
      true
    );
  });
});
