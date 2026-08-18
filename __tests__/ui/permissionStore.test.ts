import type { ConnectedSite } from '@/background/service/permission';
import { CHAINS_ENUM } from '@/constant';
import { usePermissionStore } from '@/ui/state/permission';
import { wallet } from '@/ui/wallet';

jest.mock('webextension-polyfill', () => ({
  storage: {
    local: {
      get: jest.fn().mockResolvedValue({}),
    },
  },
  tabs: {
    onCreated: {
      addListener: jest.fn(),
    },
  },
}));

jest.mock('@/ui/wallet', () => ({
  wallet: {
    getConnectedSites: jest.fn(),
    removeConnectedSite: jest.fn(),
    favoriteWebsite: jest.fn(),
    unFavoriteWebsite: jest.fn(),
    topConnectedSite: jest.fn(),
    unpinConnectedSite: jest.fn(),
    removeAllRecentConnectedSites: jest.fn(),
    setRecentConnectedSites: jest.fn(),
  },
}));

const connectedSite: ConnectedSite = {
  origin: 'https://rabby.io',
  icon: '',
  name: 'Rabby',
  chain: CHAINS_ENUM.ETH,
  isSigned: false,
  isTop: false,
  isConnected: true,
};

const pinnedSite: ConnectedSite = {
  ...connectedSite,
  origin: 'https://debank.com',
  name: 'DeBank',
  isTop: true,
  order: 1,
};

describe('permission store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usePermissionStore.setState({ websites: [] });
  });

  test('loads the connected-site query result', async () => {
    (wallet.getConnectedSites as jest.Mock).mockResolvedValue([connectedSite]);

    await usePermissionStore.getState().getWebsites();

    expect(usePermissionStore.getState().websites).toEqual([connectedSite]);
  });

  test('keeps permission mutations behind the existing wallet APIs', async () => {
    (wallet.getConnectedSites as jest.Mock).mockResolvedValue([connectedSite]);
    const store = usePermissionStore.getState();

    await store.removeWebsite(connectedSite.origin);
    await store.favoriteWebsite(connectedSite.origin);
    await store.unFavoriteWebsite(connectedSite.origin);
    await store.pinWebsite(connectedSite.origin);
    await store.unpinWebsite(connectedSite.origin);
    await store.clearAll();

    expect(wallet.removeConnectedSite).toHaveBeenCalledWith(
      connectedSite.origin
    );
    expect(wallet.favoriteWebsite).toHaveBeenCalledWith(connectedSite.origin);
    expect(wallet.unFavoriteWebsite).toHaveBeenCalledWith(
      connectedSite.origin
    );
    expect(wallet.topConnectedSite).toHaveBeenCalledWith(connectedSite.origin);
    expect(wallet.unpinConnectedSite).toHaveBeenCalledWith(
      connectedSite.origin
    );
    expect(wallet.removeAllRecentConnectedSites).toHaveBeenCalledTimes(1);
    expect(wallet.getConnectedSites).toHaveBeenCalledTimes(6);
  });

  test('optimistically reorders before applying the authoritative result', async () => {
    let finishReorder!: () => void;
    (wallet.setRecentConnectedSites as jest.Mock).mockReturnValue(
      new Promise<void>((resolve) => {
        finishReorder = resolve;
      })
    );
    (wallet.getConnectedSites as jest.Mock).mockResolvedValue([
      connectedSite,
      pinnedSite,
    ]);
    const reordered = [pinnedSite, connectedSite];

    const update = usePermissionStore
      .getState()
      .reorderWebsites(reordered);

    expect(usePermissionStore.getState().websites).toEqual(reordered);
    expect(wallet.setRecentConnectedSites).toHaveBeenCalledWith(reordered);

    finishReorder();
    await update;
    expect(usePermissionStore.getState().websites).toEqual([
      connectedSite,
      pinnedSite,
    ]);
  });
});
