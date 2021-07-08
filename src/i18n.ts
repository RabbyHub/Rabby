import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

export const fetchLocale = async (locale) => {
  const res = await window.fetch(`./_locales/${locale}/messages.json`);
  const data: Record<
    string,
    { message: string; description: string }
  > = await res.json();
  return Object.keys(data).reduce((res, key) => {
    return {
      ...res,
      [key.replace(/__/g, ' ')]: data[key].message,
    };
  }, {});
};

i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    fallbackLng: 'en',
    defaultNS: 'translations',
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

export const I18N_NS = 'translations';

export const addResourceBundle = async (locale: string) => {
  if (i18n.hasResourceBundle(locale, I18N_NS)) return;
  const bundle = await fetchLocale(locale);

  i18n.addResourceBundle(locale, 'translations', bundle);
};

addResourceBundle('en');

i18n.on('languageChanged', function (lng) {
  addResourceBundle(lng);
});

export default i18n;
