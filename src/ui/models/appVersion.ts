import { createModel } from '@rematch/core';
import { RootModel } from '.';

import { getUpdateContent } from 'changeLogs/index';

console.log('r', process.env.release);

type IState = {
  firstNotice: boolean;
  updateContent: string;
  version: string;
  isNewUser?: boolean;
  hasShowedGuide?: boolean;
};

/**
 * @description state about user installtion, app version
 */
export const appVersion = createModel<RootModel>()({
  name: 'appVersion',
  state: <IState>{
    firstNotice: false,
    updateContent: '',
    version: '',
    isNewUser: true,
    hasShowedGuide: true,
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
    async checkIfFirstLoginAsync(_: void, store) {
      const firstOpen = await store.app.wallet.getIsFirstOpen();
      const isNewUser = await store.app.wallet.getIsNewUser();
      const hasShowedGuide = await store.app.wallet.getPreference(
        'hasShowedGuide'
      );
      let updateContent = await getUpdateContent();

      const locale = store.preference?.locale || 'en';
      const version = process.env.release || '0';
      const versionMd = `${version.replace(/\./g, '')}.md`;

      const path = locale !== 'en' ? `${locale}/${versionMd}` : versionMd;

      try {
        // https://webpack.js.org/api/module-methods/#magic-comments
        const data = await import(
          /* webpackInclude: /\.md$/ */
          /* webpackMode: "lazy" */
          /* webpackPrefetch: true */
          /* webpackPreload: true */
          `changeLogs/${path}`
        );
        if (data.default && typeof data.default === 'string') {
          updateContent = data.default;
        }
      } catch (error) {
        console.error('Changelog loading error', error);
      }

      dispatch.appVersion.setField({
        isNewUser,
        hasShowedGuide,
        version,
        updateContent,
        ...(firstOpen &&
          updateContent && {
            firstNotice: firstOpen,
          }),
      });
    },

    async afterFirstLogin(_: void, store) {
      store.app.wallet.updateIsFirstOpen();
      dispatch.appVersion.setField({ firstNotice: false });
    },
    async closeGuide(_: void, store) {
      store.app.wallet.updateHasShowedGuide();
      dispatch.appVersion.setField({ hasShowedGuide: true });
    },
  }),
});
