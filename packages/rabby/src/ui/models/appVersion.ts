import { createModel } from '@rematch/core';
import { RootModel } from '.';

import { getUpdateContent } from 'changeLogs/index';

type IState = {
  firstNotice: boolean;
  updateContent: string;
};

/**
 * @description state about user installtion, app version
 */
export const appVersion = createModel<RootModel>()({
  name: 'appVersion',
  state: <IState>{
    firstNotice: false,
    updateContent: '',
  },
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
    async checkIfFirstLoginAsync(_?, store?) {
      const firstOpen = await store.app.wallet.getIsFirstOpen();
      const updateContent = await getUpdateContent();
      dispatch.appVersion.setField({
        updateContent,
        ...(firstOpen &&
          updateContent && {
            firstNotice: firstOpen,
          }),
      });
    },

    async afterFirstLogin(_?: void, store?) {
      store.app.wallet.updateIsFirstOpen();
      dispatch.appVersion.setField({ firstNotice: false });
    },
  }),
});
