import { createModel } from '@rematch/core';
import { ConnectedSite } from '@/background/service/permission';
import { RootModel } from '.';

interface PermissionState {
  websites: ConnectedSite[];
}

export const permission = createModel<RootModel>()({
  name: 'permission',

  state: {
    websites: [],
  } as PermissionState,

  reducers: {
    setField(state, payload: Partial<typeof state>) {
      return Object.keys(payload).reduce(
        (accu, key) => {
          accu[key] = payload[key];
          return accu;
        },
        { ...state }
      );
    },
  },

  effects: (dispatch) => ({
    async getWebsites(_: void, store) {
      const sites = await store.app.wallet.getConnectedSites();
      dispatch.permission.setField({
        websites: sites,
      });
    },
    async removeWebsite(origin: string, store) {
      await store.app.wallet.removeConnectedSite(origin);
      await dispatch.permission.getWebsites();
    },
    async favoriteWebsite(origin: string, store) {
      await store.app.wallet.favoriteWebsite(origin);
      await dispatch.permission.getWebsites();
    },
    async unFavoriteWebsite(origin: string, store) {
      await store.app.wallet.unFavoriteWebsite(origin);
      await dispatch.permission.getWebsites();
    },
    async pinWebsite(origin: string, store) {
      await store.app.wallet.topConnectedSite(origin);
      await dispatch.permission.getWebsites();
    },
    async unpinWebsite(origin: string, store) {
      await store.app.wallet.unpinConnectedSite(origin);
      await dispatch.permission.getWebsites();
    },
    async clearAll(_: void, store) {
      await store.app.wallet.removeAllRecentConnectedSites();
      await dispatch.permission.getWebsites();
    },
    async reorderWebsites(websites: ConnectedSite[], store) {
      dispatch.permission.setField({
        websites,
      });
      await store.app.wallet.setRecentConnectedSites(websites);
      await dispatch.permission.getWebsites();
    },
  }),
});
