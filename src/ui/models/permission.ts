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
    getWebsites(_, store) {
      // TODO
    },
    removeWebsite(origin: string, store) {
      // TODO
    },
    favoriteWebsite(origin: string, store) {
      // TODO
    },
    unFavoriteWbsite(origin: string, store) {
      // TODO
    },
    clearAll() {
      // TODO
    },
    reorderWebsites(websites: ConnectedSite[], store) {
      // TODO
    },
  }),
});
