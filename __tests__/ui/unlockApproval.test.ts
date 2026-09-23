import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { runInNewContext } from 'vm';
import { ModuleKind, transpileModule } from 'typescript';
import * as approvalHooks from '@/ui/utils/hooks';
import * as ahooks from 'ahooks';
import { useEventBusListener } from '@/ui/hooks/useEventBusListener';
import eventBus from '@/eventBus';

const currentApproval = {
  id: 'unlock-1',
  data: { approvalComponent: 'Unlock' },
};
const mockWallet = {
  getApproval: jest.fn(async () => currentApprovalRead),
  resolveApprovalFor: jest.fn(async () => ({ accepted: true })),
  unlock: jest.fn(async () => undefined),
  savedUnencryptedKeyringData: jest.fn(() => new Promise(() => undefined)),
  isUnlocked: jest.fn(async () => true),
};
const history = { replace: jest.fn() };
let currentApprovalRead: any = null;

jest.mock('react-router-dom', () => ({
  useHistory: () => history,
  useLocation: () => ({ search: '' }),
}));
jest.mock('@/ui/utils/WalletContext', () => ({ useWallet: () => mockWallet }));
jest.mock('@/ui/utils/ledger', () => ({}));
jest.mock('@/ui/utils/approval-popup', () => ({
  useApprovalPopup: () => ({ showPopup: jest.fn(), enablePopup: () => false }),
}));
jest.mock('@/ui/utils/useDeviceConnect', () => ({
  useDeviceConnect: () => jest.fn(async () => true),
}));
jest.mock('@/ui/store', () => ({
  useRabbyDispatch: () => ({
    preference: { setUnlockPreferredMethod: jest.fn(async () => undefined) },
    account: {},
  }),
  useRabbySelector: () => false,
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('@/ui/hooks/usePreference', () => ({
  useThemeMode: () => ({ isDarkTheme: false }),
}));
jest.mock('@/ui/utils/biometric', () => ({
  isBiometricUnlockSupported: jest.fn(() => new Promise(() => undefined)),
}));
jest.mock('@/ui/state/walletStatus', () => {
  const store: any = () => false;
  store.setState = jest.fn();
  return { useWalletStatusStore: store };
});

const Button = ({ children, onClick }: any) =>
  React.createElement('button', { onClick }, children);
const Form = Object.assign(
  ({ children }: any) => React.createElement('form', null, children),
  {
    Item: ({ children }: any) => React.createElement('div', null, children),
    useForm: () => [{}],
  }
);
const styledComponent = ({ children }: any) =>
  React.createElement('div', null, children);
const styledMock: any = (...args: any[]) =>
  Array.isArray(args[0]) ? styledComponent : () => styledComponent;
styledMock.div = styledMock;
styledMock.button = styledMock;
describe('Unlock approval binding', () => {
  let root: Root;
  let container: HTMLDivElement;
  let Unlock: React.ComponentType;

  beforeAll(() => {
    const compiled = transpileModule(
      readFileSync(
        resolve(__dirname, '../../src/ui/views/Unlock/index.tsx'),
        'utf8'
      ),
      {
        compilerOptions: {
          module: ModuleKind.CommonJS,
          jsx: 2,
          esModuleInterop: true,
        },
      }
    ).outputText;
    const exports: any = {};
    const modules: Record<string, any> = {
      react: React,
      antd: { Input: React.forwardRef(() => null), Form, Button, InputRef: {} },
      'react-i18next': { useTranslation: () => ({ t: (key: string) => key }) },
      'react-router-dom': {
        useHistory: () => history,
        useLocation: () => ({ search: '' }),
      },
      'ui/utils': {
        ...approvalHooks,
        useWallet: () => mockWallet,
        getUiType: () => ({
          isNotification: true,
          isTab: false,
          isDesktop: false,
          isPop: false,
        }),
        openInternalPageInTab: jest.fn(),
        isSameAddress: () => true,
      },
      '@/ui/store': {
        useRabbyDispatch: () => ({
          preference: { setUnlockPreferredMethod: jest.fn() },
          account: {},
        }),
        useRabbySelector: () => false,
      },
      '@/ui/state/walletStatus': {
        useWalletStatusStore: Object.assign(() => false, {
          setState: jest.fn(),
        }),
      },
      '@/ui/hooks/usePreference': {
        useThemeMode: () => ({ isDarkTheme: false }),
      },
      '@/ui/utils/biometric': {
        isBiometricUnlockSupported: () => new Promise(() => undefined),
      },
      '@/ui/hooks/useEventBusListener': { useEventBusListener },
      '@/constant': { EVENTS: { UNLOCK_WALLET: 'UNLOCK_WALLET' } },
      '@/ui/component/FullscreenContainer': {
        FullscreenContainer: ({ children }: any) =>
          React.createElement('div', null, children),
      },
      clsx: () => '',
      lodash: { isString: (value: unknown) => typeof value === 'string' },
      qs: { parse: () => ({}) },
      'styled-components': styledMock,
      ahooks,
      '@/utils/ga4': { ga4: { fireEvent: jest.fn() } },
    };
    runInNewContext(compiled, {
      exports,
      window,
      document,
      console,
      setTimeout,
      clearTimeout,
      require: (name: string) => {
        if (/^(?:@\/)?ui\/assets\//.test(name))
          return { ReactComponent: () => null };
        if (!(name in modules)) throw new Error(`Unexpected import: ${name}`);
        return modules[name];
      },
    });
    Unlock = exports.default;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    currentApprovalRead = null;
    container = document.createElement('div');
    root = createRoot(container);
    act(() => root.render(React.createElement(Unlock)));
  });

  afterEach(() => {
    act(() => root.unmount());
    jest.restoreAllMocks();
  });

  test('binds from the unlock event and resolves only after the binding render', async () => {
    await act(async () => {
      currentApprovalRead = currentApproval;
      eventBus.emit('UNLOCK_WALLET');
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(mockWallet.resolveApprovalFor).toHaveBeenCalledWith(
      expect.objectContaining({
        approval: { id: 'unlock-1', component: 'Unlock' },
      })
    );
    expect(history.replace).not.toHaveBeenCalledWith('/approval');
  });

  test('returns signing approvals to their own screen without resolving them', async () => {
    currentApprovalRead = {
      id: 'sign-1',
      data: { approvalComponent: 'SignTx' },
    };
    await act(async () => {
      eventBus.emit('UNLOCK_WALLET');
      await Promise.resolve();
    });
    expect(mockWallet.resolveApprovalFor).not.toHaveBeenCalled();
    expect(history.replace).toHaveBeenCalledWith('/approval');
  });

  test('does not settle twice when the unlock broadcast is duplicated', async () => {
    currentApprovalRead = currentApproval;
    await act(async () => {
      eventBus.emit('UNLOCK_WALLET');
      eventBus.emit('UNLOCK_WALLET');
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(mockWallet.resolveApprovalFor).toHaveBeenCalledTimes(1);
  });
});
