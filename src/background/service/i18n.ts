import i18n from 'i18next';
import browser from 'webextension-polyfill';
import { LANGS } from '@/constant';

export const getFirstPreferredLangCode = async () => {
  let userPreferredLocaleCodes: string[];

  try {
    userPreferredLocaleCodes = await browser.i18n.getAcceptLanguages();
    console.log('userPreferredLocaleCodes', userPreferredLocaleCodes);
  } catch (e) {
    userPreferredLocaleCodes = [];
  }
  if (!userPreferredLocaleCodes) {
    userPreferredLocaleCodes = [];
  }
  const firstPreferredLangCode = LANGS.find((item) => {
    return userPreferredLocaleCodes.find(
      (code) =>
        code.toLowerCase() === item.code.toLowerCase() ||
        item.code.toLowerCase() === code.toLowerCase().split('-')[0]
    );
  })?.code;
  return firstPreferredLangCode || 'en';
};

export const fetchLocale = async (locale) => {
  const res = await fetch(`./locales/${locale}/messages.json`);
  const data: Record<
    string,
    { message: string; description: string }
  > = await res.json();
  return data;
};

i18n.init({
  fallbackLng: 'en',
  defaultNS: 'translations',
  interpolation: {
    escapeValue: false, // react already safes from xss
  },
  returnNull: false,
  returnEmptyString: false,
});

export const I18N_NS = 'translations';

export const addResourceBundle = async (locale: string) => {
  if (i18n.hasResourceBundle(locale, I18N_NS)) return;
  const bundle = await fetchLocale(locale);

  i18n.addResourceBundle(locale, 'translations', bundle);
};

if (process.env.NODE_ENV !== 'test') {
  addResourceBundle('en');

  i18n.on('languageChanged', function (lng) {
    addResourceBundle(lng);
  });
}

export default i18n;
