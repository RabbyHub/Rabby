import i18n from 'i18next';
import browser from 'webextension-polyfill';
import { LANGS } from '@/constant';

export const getFirstPreferredLangCode = async () => {
  let userPreferredLocaleCodes: string[];

  try {
    userPreferredLocaleCodes = [browser.i18n.getUILanguage()];
  } catch (e) {
    userPreferredLocaleCodes = [];
  }
  if (!userPreferredLocaleCodes) {
    userPreferredLocaleCodes = [];
  }
  let firstPreferredLangCode = 'en';
  const supportedLocales = LANGS.map((item) => ({
    item,
    locale: new Intl.Locale(item.code),
  }));
  for (const code of userPreferredLocaleCodes) {
    const preferredLocale = new Intl.Locale(code);
    const maximizedPreferredLocale = preferredLocale.maximize();
    const lang =
      supportedLocales.find(
        ({ locale }) => locale.baseName === preferredLocale.baseName
      )?.item ||
      supportedLocales.find(
        ({ locale }) =>
          locale.language === preferredLocale.language &&
          !locale.script &&
          !locale.region
      )?.item ||
      supportedLocales.find(({ locale }) => {
        const supportedLocale = locale.maximize();
        return (
          supportedLocale.language === maximizedPreferredLocale.language &&
          supportedLocale.script === maximizedPreferredLocale.script
        );
      })?.item;
    if (lang) {
      firstPreferredLangCode = lang.code;
      break;
    }
  }
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
