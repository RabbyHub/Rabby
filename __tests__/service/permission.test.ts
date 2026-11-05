jest.mock('@/constant', () => ({
  CHAINS: {},
  CHAINS_ENUM: { ETH: 'ETH' },
  INTERNAL_REQUEST_ORIGIN: 'https://rabby.io',
  SIGN_PERMISSION_TYPES: {},
}));

jest.mock('@/background/utils', () => ({ createPersistStore: jest.fn() }));

jest.mock('@/utils/chain', () => ({
  findChain: jest.fn(),
  waitForLocalMainnetList: jest.fn(),
}));

import { createPersistStore } from '@/background/utils';
import permissionService, {
  ConnectedSite,
} from '@/background/service/permission';
import { findChain, waitForLocalMainnetList } from '@/utils/chain';

const createSite = (
  origin: string,
  chain: string,
  extra?: Partial<ConnectedSite>
): ConnectedSite => ({
  origin,
  name: origin,
  icon: '',
  chain: chain as ConnectedSite['chain'],
  isSigned: false,
  isTop: false,
  isConnected: true,
  ...extra,
});

const initWith = async (sites: ConnectedSite[]) => {
  jest.mocked(createPersistStore).mockResolvedValue({
    dumpCache: sites.map((v) => ({ k: v.origin, v, e: 0 })),
  });
  await permissionService.init();
};

describe('permissionService sites on unsupported chains', () => {
  let supported: string[];

  beforeEach(() => {
    supported = ['ETH', 'BSC'];
    jest
      .mocked(findChain)
      .mockImplementation(({ enum: chainEnum }) =>
        chainEnum && supported.includes(chainEnum)
          ? ({ enum: chainEnum } as ReturnType<typeof findChain>)
          : undefined
      );
    jest.mocked(waitForLocalMainnetList).mockResolvedValue(undefined);
  });

  it('checks site chains only after the cached chain list is loaded', async () => {
    jest.mocked(waitForLocalMainnetList).mockImplementation(async () => {
      supported.push('NEW');
    });

    await initWith([createSite('https://a.com', 'NEW')]);

    expect(permissionService.getConnectedSite('https://a.com')?.chain).toBe(
      'NEW'
    );
  });

  it('keeps a site on a removed chain at startup, disconnected on ETH', async () => {
    await initWith([
      createSite('https://a.com', 'GONE', { isFavorite: true }),
      createSite('https://b.com', 'BSC'),
    ]);

    expect(permissionService.getWithoutUpdate('https://a.com')).toMatchObject({
      chain: 'ETH',
      isConnected: false,
      isFavorite: true,
    });
    expect(
      permissionService.getConnectedSites().map((site) => site.origin)
    ).toEqual(['https://b.com']);
    expect(
      permissionService.store.dumpCache.find(
        (item) => item.k === 'https://a.com'
      )?.v
    ).toMatchObject({ chain: 'ETH', isConnected: false });
  });

  it('persists the reset once a chain is removed at runtime', async () => {
    await initWith([
      createSite('https://a.com', 'BSC'),
      createSite('https://b.com', 'ETH'),
    ]);
    supported = ['ETH'];

    expect(permissionService.resetSitesWithUnsupportedChain()).toEqual([
      expect.objectContaining({
        origin: 'https://a.com',
        chain: 'BSC',
        isConnected: true,
      }),
    ]);
    expect(
      permissionService.getRecentConnectedSites().map((site) => site.origin)
    ).toEqual(['https://b.com']);
    expect(permissionService.hasPermission('https://a.com')).toBe(false);
    expect(permissionService.resetSitesWithUnsupportedChain()).toEqual([]);
  });
});
