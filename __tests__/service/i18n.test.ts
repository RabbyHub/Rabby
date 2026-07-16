import browser from 'webextension-polyfill';
import { getFirstPreferredLangCode } from '@/background/service/i18n';

jest.mock('webextension-polyfill', () => ({
  i18n: {
    getUILanguage: jest.fn(),
  },
}));

jest.mock('@/constant', () => ({
  LANGS: jest.requireActual('../../_raw/locales/index.json'),
}));

const mockGetUILanguage = browser.i18n.getUILanguage as jest.Mock;

describe('getFirstPreferredLangCode', () => {
  it.each([
    ['pt-BR', 'pt-BR'],
    ['pt', 'pt'],
    ['pt-PT', 'pt'],
    ['pt-AO', 'pt'],
    ['zh-CN', 'zh-CN'],
    ['zh-SG', 'zh-CN'],
    ['zh-TW', 'zh-HK'],
    ['zh-Hant', 'zh-HK'],
    ['fr-CA', 'fr-FR'],
    ['uk', 'uk-UA'],
    ['uk-UA', 'uk-UA'],
  ])('maps %s to %s', async (uiLanguage, expectedLanguage) => {
    mockGetUILanguage.mockReturnValue(uiLanguage);

    await expect(getFirstPreferredLangCode()).resolves.toBe(expectedLanguage);
  });
});
