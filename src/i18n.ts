import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../_raw/_locales/en/messages.json';

export const fetchLocale = async (locale) => {
  const res = await window.fetch(`./_locales/${locale}/messages.json`);
  const data: typeof en = await res.json();
  return data;
  // return Object.keys(data).reduce((res, key) => {
  //   return {
  //     ...res,
  //     [key.replace(/__/g, ' ')]: data[key].message,
  //   };
  // }, {});
};

i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    fallbackLng: 'en',
    defaultNS: 'translations',
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
    returnNull: false,
  });

export const I18N_NS = 'translations';

export const addResourceBundle = async (locale: string) => {
  if (i18n.hasResourceBundle(locale, I18N_NS)) {
    return;
  }
  const bundle = await fetchLocale(locale);

  i18n.addResourceBundle(locale, I18N_NS, bundle);
};

addResourceBundle('en');

i18n.on('languageChanged', function (lng) {
  addResourceBundle(lng);
});

export default i18n;
