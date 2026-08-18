import type { ConnectedSite } from '@/background/service/permission';
import { wallet } from '@/ui/wallet';
import { create } from 'zustand';

export type PermissionState = {
  websites: ConnectedSite[];
};

type PermissionActions = {
  getWebsites: () => Promise<void>;
  removeWebsite: (origin: string) => Promise<void>;
  favoriteWebsite: (origin: string) => Promise<void>;
  unFavoriteWebsite: (origin: string) => Promise<void>;
  pinWebsite: (origin: string) => Promise<void>;
  unpinWebsite: (origin: string) => Promise<void>;
  clearAll: () => Promise<void>;
  reorderWebsites: (websites: ConnectedSite[]) => Promise<void>;
};

export type PermissionStore = PermissionState & PermissionActions;

export const usePermissionStore = create<PermissionStore>()((set, get) => ({
  websites: [],

  async getWebsites() {
    const websites = await wallet.getConnectedSites();
    set({ websites });
  },
  async removeWebsite(origin) {
    await wallet.removeConnectedSite(origin);
    await get().getWebsites();
  },
  async favoriteWebsite(origin) {
    await wallet.favoriteWebsite(origin);
    await get().getWebsites();
  },
  async unFavoriteWebsite(origin) {
    await wallet.unFavoriteWebsite(origin);
    await get().getWebsites();
  },
  async pinWebsite(origin) {
    await wallet.topConnectedSite(origin);
    await get().getWebsites();
  },
  async unpinWebsite(origin) {
    await wallet.unpinConnectedSite(origin);
    await get().getWebsites();
  },
  async clearAll() {
    await wallet.removeAllRecentConnectedSites();
    await get().getWebsites();
  },
  async reorderWebsites(websites) {
    set({ websites });
    await wallet.setRecentConnectedSites(websites);
    await get().getWebsites();
  },
}));
