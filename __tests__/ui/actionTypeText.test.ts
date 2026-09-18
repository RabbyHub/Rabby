import { readFileSync } from 'fs';
import { createInstance } from 'i18next';
import { resolve } from 'path';
import { runInNewContext } from 'vm';
import { ModuleKind, transpileModule } from 'typescript';
import en from '../../_raw/locales/en/messages.json';
import zhCN from '../../_raw/locales/zh-CN/messages.json';

const i18n = createInstance();

// Jest's transform excludes .tsx. Load the production helper with an isolated
// i18n instance so the test does not initialize the extension runtime.
const compiled = transpileModule(
  readFileSync(
    resolve(
      __dirname,
      '../../src/ui/views/Approval/components/Actions/utils.tsx'
    ),
    'utf8'
  ),
  {
    compilerOptions: {
      module: ModuleKind.CommonJS,
      esModuleInterop: true,
    },
  }
).outputText;
const helper = {} as typeof import('@/ui/views/Approval/components/Actions/utils');
runInNewContext(compiled, {
  exports: helper,
  require: (name: string) => {
    if (name === '@/i18n') return { __esModule: true, default: i18n };
    throw new Error(`Unexpected test dependency: ${name}`);
  },
});
const { getActionTypeTextByType, isKnownActionType } = helper;

describe('Safe transaction action labels', () => {
  beforeAll(async () => {
    await i18n.init({
      lng: 'en',
      fallbackLng: 'en',
      resources: {
        en: { translation: en },
        'zh-CN': { translation: zhCN },
      },
    });
  });

  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  test.each([
    ['add_liquidity', 'Add Liquidity'],
    ['multi_swap_token', 'Swap Token'],
    ['swap_token_limit_pay', 'Swap Token Limit Pay'],
    ['transfer_ownership', 'Transfer Assets Ownership'],
  ])('labels the parseTx API action %s as %s', (type, label) => {
    expect(isKnownActionType(type)).toBe(true);
    expect(getActionTypeTextByType(type)).toBe(label);
  });

  test.each([
    ['swap_token', 'Swap Token'],
    ['contract_call', 'Contract Call'],
  ])('preserves the existing label for %s', (type, label) => {
    expect(isKnownActionType(type)).toBe(true);
    expect(getActionTypeTextByType(type)).toBe(label);
  });

  test.each([
    '',
    'unrecognized_action',
    'constructor',
    '__proto__',
    'toString',
  ])('keeps the unknown action fallback for %j', (type) => {
    expect(isKnownActionType(type)).toBe(false);
    expect(getActionTypeTextByType(type)).toBe(en.page.signTx.unknownAction);
  });

  test('updates labels when the current language changes', async () => {
    expect(getActionTypeTextByType('add_liquidity')).toBe(
      en.page.signTx.addLiquidity.title
    );

    await i18n.changeLanguage('zh-CN');

    expect(isKnownActionType('add_liquidity')).toBe(true);
    expect(getActionTypeTextByType('add_liquidity')).toBe(
      zhCN.page.signTx.addLiquidity.title
    );
    expect(getActionTypeTextByType('unrecognized_action')).toBe(
      zhCN.page.signTx.unknownAction
    );

    await i18n.changeLanguage('en');

    expect(getActionTypeTextByType('add_liquidity')).toBe(
      en.page.signTx.addLiquidity.title
    );
  });
});
