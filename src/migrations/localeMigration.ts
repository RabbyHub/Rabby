import { PreferenceStore } from '@/background/service/preference';

export default {
  version: 7,
  async migrator(data: { preference: PreferenceStore | undefined }) {
    try {
      if (data.preference === undefined) return undefined;

      let locale = data.preference.locale || 'en';
      if (locale === 'jp') {
        locale = 'ja';
      } else if (locale.includes('_')) {
        locale = locale.replace(/_/g, '-');
      }
      return {
        preference: {
          ...data.preference,
          locale,
        },
      };
    } catch (e) {
      return {
        preference: {
          ...data.preference,
          locale: 'en',
        },
      };
    }
  },
};
