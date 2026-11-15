import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import Form from 'antd/lib/form';
import type { FormInstance } from 'antd/lib/form';
import { isValidAddress } from '@ethereumjs/util';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { runInNewContext } from 'vm';
import { JsxEmit, ModuleKind, transpileModule } from 'typescript';
import { useEnsInputResolver } from '@/ui/hooks/useEnsInputResolver';
import { resolveEnsAddressByName } from '@/ui/utils/ens';

jest.mock('@/ui/utils/ens', () => ({
  resolveEnsAddressByName: jest.fn(),
}));

const ADDRESS_A = '0x1111111111111111111111111111111111111111';
const ADDRESS_B = '0x2222222222222222222222222222222222222222';
const mockResolve = resolveEnsAddressByName as jest.MockedFunction<
  typeof resolveEnsAddressByName
>;
const wallet = {
  importWatchAddress: jest.fn(async () => []),
  getPageStateCache: jest.fn(async (): Promise<any> => null),
  clearPageStateCache: jest.fn(),
  setPageStateCache: jest.fn(),
};
const history = {
  location: { pathname: '/import/watch-address' },
  length: 1,
  goBack: jest.fn(),
  replace: jest.fn(),
};
const scanListeners = new Set<(data: { address: string }) => void>();
let formInstance: FormInstance;

// Keep the real Form store, watchers and field updates while excluding the
// extension runtime, navigation and unrelated page chrome.
function TestPage({ form, formProps, onSubmit, nextDisabled, children }: any) {
  formInstance = form;
  return React.createElement(
    Form,
    { form, ...formProps, onFinish: onSubmit },
    children,
    React.createElement(
      'button',
      { type: 'submit', disabled: nextDisabled, 'data-testid': 'confirm' },
      'Confirm'
    )
  );
}

function loadImportWatchAddress() {
  const compiled = transpileModule(
    readFileSync(
      resolve(__dirname, '../../src/ui/views/ImportWatchAddress.tsx'),
      'utf8'
    ),
    {
      compilerOptions: {
        module: ModuleKind.CommonJS,
        jsx: JsxEmit.React,
        esModuleInterop: true,
      },
    }
  ).outputText;
  const exports: any = {};
  const Empty = () => null;
  const modules: Record<string, any> = {
    react: React,
    antd: {
      Form,
      Input: {
        TextArea: ({ autoSize: _autoSize, size: _size, ...props }: any) =>
          React.createElement('textarea', props),
      },
      Spin: () => React.createElement('span', { role: 'status' }),
    },
    'react-router-dom': { useHistory: () => history },
    'react-i18next': { useTranslation: () => ({ t: (key: string) => key }) },
    'ui/component/QRCodeReader': Empty,
    '@ethereumjs/util': { isValidAddress },
    'ui/component': {
      StrayPageWithButton: TestPage,
      Popup: Empty,
      Modal: Empty,
    },
    'ui/utils': {
      useWallet: () => wallet,
      useWalletRequest: () => [wallet.importWatchAddress, false],
    },
    'ui/utils/webapi': { openInternalPageInTab: jest.fn() },
    consts: {
      EVENTS: { WALLETCONNECT: { SCAN_ACCOUNT: 'scan-account' } },
      KEYRING_CLASS: { WATCH: 'Watch Address' },
    },
    'react-use': { useMedia: () => false },
    clsx: () => '',
    'ui/utils/useRepeatImportConfirm': {
      useRepeatImportConfirm: () => ({ show: jest.fn(), contextHolder: null }),
    },
    '@/eventBus': {
      addEventListener: (_event: string, listener: any) =>
        scanListeners.add(listener),
      removeEventListener: (_event: string, listener: any) =>
        scanListeners.delete(listener),
    },
    '@/utils': { safeJSONParse: JSON.parse },
    '@/ui/hooks/useEnsInputResolver': { useEnsInputResolver },
    './AddAddress/useCreateAddress': {
      useCreateAddressActions: () => ({ openSuccessPage: jest.fn() }),
    },
    '../assets/add-address': { RcWatchAddressScan: Empty },
  };
  runInNewContext(compiled, {
    exports,
    document,
    console,
    require: (name: string) => {
      if (/^ui\/assets\//.test(name)) {
        return { ReactComponent: Empty, default: '' };
      }
      if (!(name in modules)) throw new Error(`Unexpected import: ${name}`);
      return modules[name];
    },
  });
  return exports.default as React.ComponentType;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe('watch address ENS input', () => {
  let root: Root;
  let container: HTMLDivElement;
  let ImportWatchAddress: React.ComponentType;

  beforeAll(() => {
    ImportWatchAddress = loadImportWatchAddress();
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn(() => ({
        matches: false,
        addListener: jest.fn(),
        removeListener: jest.fn(),
      })),
    });
  });

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockResolve.mockReset();
    wallet.getPageStateCache.mockResolvedValue(null);
    scanListeners.clear();
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    jest.useRealTimers();
    delete (globalThis as any).IS_REACT_ACT_ENVIRONMENT;
  });

  async function render() {
    await act(async () => root.render(React.createElement(ImportWatchAddress)));
  }

  async function typeAddress(value: string) {
    await act(async () => {
      const input = container.querySelector('textarea')!;
      input.value = value;
      Simulate.change(input);
    });
  }

  async function startLookup() {
    await act(async () => jest.advanceTimersByTime(300));
  }

  function confirmButton() {
    return container.querySelector<HTMLButtonElement>(
      '[data-testid="confirm"]'
    )!;
  }

  it.each(['bob.eth', '', ADDRESS_B])(
    'discards a slow result after the field changes to %p',
    async (nextInput) => {
      const pending = deferred<{ addr: string; name: string } | null>();
      mockResolve.mockReturnValue(pending.promise);
      await render();
      await typeAddress('alice.eth');
      await startLookup();
      expect(mockResolve).toHaveBeenCalledWith('alice.eth', wallet);

      await typeAddress(nextInput);
      await act(async () =>
        pending.resolve({ addr: ADDRESS_A, name: 'alice.eth' })
      );

      expect(formInstance.getFieldValue('address')).toBe(nextInput);
      expect(container.querySelector('.ens-search')).toBeNull();
      expect(container.textContent).not.toContain(ADDRESS_A);
      expect(confirmButton().disabled).toBe(nextInput !== ADDRESS_B);
      expect(wallet.importWatchAddress).not.toHaveBeenCalled();
    }
  );

  it('does not submit an unresolved name, even when the form is submitted directly', async () => {
    mockResolve.mockReturnValue(new Promise(() => undefined));
    await render();
    await typeAddress('alice.eth');
    await startLookup();

    expect(container.textContent).toContain(
      'page.selectToAddress.resolvingAddress'
    );
    expect(container.textContent).not.toContain(
      'page.newAddress.addContacts.notAValidAddress'
    );
    expect(confirmButton().disabled).toBe(true);
    await act(async () => formInstance.submit());
    expect(wallet.importWatchAddress).not.toHaveBeenCalled();
  });

  it.each([ADDRESS_B, ` ${ADDRESS_B} `])(
    'invalidates an in-flight lookup when the scan event supplies %p',
    async (scannedAddress) => {
      const pending = deferred<{ addr: string; name: string } | null>();
      mockResolve.mockReturnValue(pending.promise);
      await render();
      await typeAddress('alice.eth');
      await startLookup();

      await act(async () => {
        scanListeners.forEach((listener) =>
          listener({ address: scannedAddress })
        );
      });
      await act(async () =>
        pending.resolve({ addr: ADDRESS_A, name: 'alice.eth' })
      );

      expect(formInstance.getFieldValue('address')).toBe(ADDRESS_B);
      expect(container.querySelector('.ens-search')).toBeNull();
      expect(confirmButton().disabled).toBe(false);
      await act(async () => formInstance.submit());
      expect(wallet.importWatchAddress).toHaveBeenCalledWith(ADDRESS_B);
    }
  );

  it('resolves a cached name and imports its selected address', async () => {
    wallet.getPageStateCache.mockResolvedValue({
      path: '/import/watch-address',
      states: { address: 'Alice.ETH' },
    });
    const pending = deferred<{ addr: string; name: string } | null>();
    mockResolve.mockReturnValue(pending.promise);
    await render();
    await startLookup();
    expect(mockResolve).toHaveBeenCalledWith('Alice.ETH', wallet);
    expect(confirmButton().disabled).toBe(true);

    await act(async () =>
      pending.resolve({ addr: ADDRESS_A, name: 'alice.eth' })
    );
    expect(container.querySelector('.ens-search')?.textContent).toContain(
      ADDRESS_A
    );
    expect(confirmButton().disabled).toBe(true);
    act(() => container.querySelector<HTMLElement>('.ens-search')!.click());

    expect(formInstance.getFieldValue('address')).toBe(ADDRESS_A);
    expect(container.querySelector('.ens-search')).toBeNull();
    expect(container.textContent).toContain('ENS: alice.eth');
    expect(confirmButton().disabled).toBe(false);
    await act(async () => formInstance.submit());
    expect(wallet.importWatchAddress).toHaveBeenCalledWith(ADDRESS_A);
  });

  it('enables a cached direct address without an ENS lookup', async () => {
    wallet.getPageStateCache.mockResolvedValue({
      path: '/import/watch-address',
      states: { address: ADDRESS_B },
    });
    await render();
    await startLookup();

    expect(formInstance.getFieldValue('address')).toBe(ADDRESS_B);
    expect(confirmButton().disabled).toBe(false);
    expect(mockResolve).not.toHaveBeenCalled();
  });
});
