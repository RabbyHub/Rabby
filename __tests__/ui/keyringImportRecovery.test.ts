import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { runInNewContext } from 'vm';
import { JsxEmit, ModuleKind, transpileModule } from 'typescript';
import useAsync from 'react-use/lib/useAsync';
import * as importErrors from '@/constant/message';

const expired = {
  code: 'KEYRING_IMPORT_EXPIRED',
  message: 'Wallet import session expired',
};

describe('import pages recover from expired keyring references', () => {
  let root: Root;
  let container: HTMLDivElement;
  let replace: jest.Mock;
  let requestKeyring: jest.Mock;
  let switchKeyring: jest.Mock;
  let modules: Record<string, any>;

  const load = (path: string) => {
    const compiled = transpileModule(
      readFileSync(resolve(__dirname, '../../src/ui/views', path), 'utf8'),
      {
        compilerOptions: {
          module: ModuleKind.CommonJS,
          jsx: JsxEmit.React,
          esModuleInterop: true,
        },
      }
    ).outputText;
    const exports: any = {};
    runInNewContext(compiled, {
      exports,
      module: { exports },
      window,
      document,
      URLSearchParams,
      require(name: string) {
        if (name in modules) return modules[name];
        if (/\.(svg|png|less)$/.test(name)) {
          return { default: '', ReactComponent: () => null };
        }
        throw new Error(`Unexpected import: ${name}`);
      },
    });
    return exports;
  };

  const render = async (Component: React.ComponentType) => {
    await act(async () => {
      root.render(React.createElement(Component));
    });
  };

  beforeEach(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    root = createRoot(container);
    replace = jest.fn();
    requestKeyring = jest.fn().mockRejectedValue(expired);
    switchKeyring = jest.fn();
    const hardware = [
      'Ledger',
      'Trezor',
      'Onekey',
      'GridPlus',
      'Keystone',
      'BitBox02',
      'ImKey',
    ];
    const constants = {
      KEYRING_CLASS: {
        MNEMONIC: 'HD Key Tree',
        HARDWARE: Object.fromEntries(
          hardware.map((name) => [name.toUpperCase(), name])
        ),
      },
      HARDWARE_KEYRING_TYPES: Object.fromEntries(
        hardware.map((name) => [name, { type: name }])
      ),
      WALLET_BRAND_TYPES: {},
      KEYRING_TYPE: { HdKeyring: 'HD Key Tree' },
      BRAND_ALIAN_TYPE_TEXT: {},
    };
    const wallet = {
      requestKeyring,
      getAllVisibleAccountsArray: async () => [],
    };
    const utils = {
      useWallet: () => wallet,
      getUiType: () => ({ isTab: true }),
    };
    modules = {
      react: React,
      'react-router-dom': {
        useHistory: () => ({ replace }),
        useLocation: () => ({ search: '?hd=HD%20Key%20Tree&keyringId=1' }),
      },
      'react-i18next': { useTranslation: () => ({ t: (key: string) => key }) },
      'react-use': { useAsync, useClickAway: () => {} },
      ahooks: {
        useDocumentVisibility: () => 'visible',
        useMemoizedFn: (fn: unknown) => fn,
        useRequest: () => ({}),
      },
      antd: {
        Button: ({ children, onClick }: any) =>
          React.createElement('button', { onClick }, children),
        Input: 'input',
        Spin: () => null,
        message: { error: jest.fn() },
      },
      clsx: () => '',
      'styled-components': { div: () => 'div' },
      'webextension-polyfill': {},
      '@/constant': constants,
      consts: constants,
      '@/constant/message': importErrors,
      '@/ui/utils': utils,
      'ui/utils': utils,
      '@/ui/utils/url': {
        query2obj: (search: string) =>
          Object.fromEntries(new URLSearchParams(search)),
      },
      '@/ui/component/NewUserImport': { Card: 'div' },
      '@/ui/state/importMnemonics': {
        useImportMnemonicsStore: Object.assign(
          (select: (state: unknown) => unknown) => select({}),
          { getState: () => ({ switchKeyring }) }
        ),
      },
      './hooks/useNewUserGuideStore': {
        useNewUserGuideStore: () => ({ store: {} }),
      },
      './GnosisChainList': { GnosisChainList: () => null },
      './AccountItem': {},
      '@/ui/utils/address': {},
      '@/utils/chain': {},
      '@/stats': { report: jest.fn() },
      '@/utils/matomo-request': { matomoRequestEvent: jest.fn() },
      '@/utils/ga4': { ga4: { fireEvent: jest.fn() } },
      '../HDManager/HDManager': {
        HDManager: () => React.createElement('div', null, 'HD manager'),
      },
      './utils': { HDManagerStateProvider: () => null },
      '../SelectAddress/route': { isHardwareImportSelectAddress: () => false },
      '../AddAddress/useCreateAddress': {},
      '../NewUserImport/hooks/useNewUserGuideStore': {
        useNewUserGuideStore: () => ({ store: {} }),
      },
    };
    for (const name of [
      'LedgerManager',
      'OnekeyManager',
      'TrezorManager',
      'MnemonicManager',
      'GridPlusManager',
      'QRCodeManager',
      'BitBox02Manager',
      'ImKeyManager',
    ]) {
      modules[`./${name}`] = {
        [name === 'OnekeyManager' ? 'OneKeyManager' : name]: () => null,
      };
    }
  });

  afterEach(() => {
    act(() => root.unmount());
    delete (globalThis as any).IS_REACT_ACT_ENVIRONMENT;
  });

  test('an expired success page leaves no success, backup, or add-more controls and returns to wallet selection', async () => {
    await render(load('NewUserImport/Success.tsx').ImportOrCreatedSuccess);
    expect(replace).toHaveBeenCalledWith('/add-address');
    expect(container.textContent).toBe('');
  });

  test('an invalid mnemonic route never initializes a manager or falls back to the first keyring', async () => {
    modules['react-router-dom'].useLocation = () => ({
      search: '?hd=HD%20Key%20Tree&keyringId=undefined',
    });
    await render(load('SelectAddress/index.tsx').default);
    expect(replace).toHaveBeenCalledWith('/add-address');
    expect(switchKeyring).not.toHaveBeenCalled();
    expect(container.textContent).toBe('');
  });

  test('a legacy hardware null ID remains valid, while a mnemonic null ID cannot select another wallet', async () => {
    const SelectAddress = load('SelectAddress/index.tsx').default;
    modules['react-router-dom'].useLocation = () => ({
      search: '?hd=Keystone&keyringId=null',
    });
    await render(SelectAddress);
    expect(replace).not.toHaveBeenCalled();
    expect(container.textContent).toBe('HD manager');
    modules['react-router-dom'].useLocation = () => ({
      search: '?hd=HD%20Key%20Tree&keyringId=null',
    });
    await render(SelectAddress);
    expect(replace).toHaveBeenCalledWith('/add-address');
    expect(container.textContent).toBe('');
  });

  test('changing mnemonic references initializes the matching store before rendering the new manager', async () => {
    let storedId: number;
    const rendered: Array<[number, number]> = [];
    switchKeyring.mockImplementation(({ stashKeyringId }) => {
      storedId = stashKeyringId;
    });
    modules['../HDManager/HDManager'].HDManager = ({
      keyringId,
    }: {
      keyringId: number;
    }) => {
      rendered.push([keyringId, storedId]);
      return null;
    };
    const SelectAddress = load('SelectAddress/index.tsx').default;
    await render(SelectAddress);
    modules['react-router-dom'].useLocation = () => ({
      search: '?hd=HD%20Key%20Tree&keyringId=2',
    });
    await render(SelectAddress);
    expect(rendered).toEqual([
      [1, 1],
      [2, 2],
    ]);
  });

  test('a late failure from the previous success route does not redirect the current wallet', async () => {
    let rejectFirst!: (error: unknown) => void;
    const first = new Promise((_resolve, reject) => {
      rejectFirst = reject;
    });
    requestKeyring.mockImplementation((_type, _method, id) =>
      id === 1 ? first : Promise.resolve([])
    );
    const Success = load('NewUserImport/Success.tsx').ImportOrCreatedSuccess;
    await render(Success);
    modules['react-router-dom'].useLocation = () => ({
      search: '?hd=HD%20Key%20Tree&keyringId=2',
    });
    await render(Success);
    await act(async () => {
      rejectFirst(expired);
    });
    expect(replace).not.toHaveBeenCalled();
  });

  test('ordinary account loading errors do not trigger expired-session navigation', async () => {
    requestKeyring.mockRejectedValue(new Error('Network unavailable'));
    await render(load('NewUserImport/Success.tsx').ImportOrCreatedSuccess);
    expect(replace).not.toHaveBeenCalled();
  });

  test('success-page cleanup removes its beforeunload listener', async () => {
    requestKeyring.mockResolvedValue(undefined);
    modules['react-router-dom'].useLocation = () => ({
      search: '?hd=Ledger&keyringId=12',
    });
    modules['./hooks/useNewUserGuideStore'].useNewUserGuideStore = () => ({
      store: { clearKeyringId: 12 },
    });
    await render(load('NewUserImport/Success.tsx').ImportOrCreatedSuccess);
    await act(async () => root.unmount());
    expect(requestKeyring).toHaveBeenCalledTimes(1);
    window.dispatchEvent(new Event('beforeunload'));
    expect(requestKeyring).toHaveBeenCalledTimes(1);
  });

  test('an unmounted manager cannot clean up a new device session when its connection resolves late', async () => {
    requestKeyring.mockResolvedValue([]);
    let resolveFirst!: (id: number) => void;
    const first = new Promise<number>((resolve) => {
      resolveFirst = resolve;
    });
    const connectHardware = jest
      .fn()
      .mockReturnValueOnce(first)
      .mockResolvedValueOnce(22);
    const wallet = { requestKeyring, connectHardware };
    modules['@/ui/utils'].useWallet = () => wallet;
    modules['react-router-dom'].useLocation = () => ({ search: '' });
    const HDManager = load('HDManager/HDManager.tsx').HDManager;
    const Manager = () =>
      React.createElement(HDManager, { keyring: 'Ledger', keyringId: null });
    await render(Manager);
    await act(async () => root.unmount());
    root = createRoot(container);
    await render(Manager);
    expect(connectHardware).toHaveBeenCalledTimes(2);
    await act(async () => {
      resolveFirst(11);
    });
    expect(requestKeyring).not.toHaveBeenCalled();
    window.dispatchEvent(new Event('beforeunload'));
    expect(requestKeyring).toHaveBeenCalledTimes(1);
    expect(requestKeyring).toHaveBeenCalledWith('Ledger', 'cleanUp', 22, true);
  });
});
