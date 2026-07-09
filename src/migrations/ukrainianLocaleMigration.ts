import { PreferenceStore } from '@/background/service/preference';

export default {
  version: 12,
  async migrator(data: { preference: PreferenceStore | undefined }) {
    if (data.preference === undefined) return undefined;

    return {
      preference: {
        ...data.preference,
        locale:
          data.preference.locale === 'ua-UA' ? 'uk-UA' : data.preference.locale,
      },
    };
  },
};
