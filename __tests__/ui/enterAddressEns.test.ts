import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { runInNewContext } from 'vm';
import { JsxEmit, ModuleKind, transpileModule } from 'typescript';
import { isValidAddress } from '@ethereumjs/util';
import { useEnsInputResolver } from '@/ui/hooks/useEnsInputResolver';
import { resolveEnsAddressByName } from '@/ui/utils/ens';

jest.mock('@/ui/utils/ens', () => ({
  resolveEnsAddressByName: jest.fn(),
}));

const resolveEns = resolveEnsAddressByName as jest.Mock;
const ADDRESS_A = '0x1111111111111111111111111111111111111111';
const ADDRESS_B = '0x2222222222222222222222222222222222222222';
const invalidLabel = 'page.whitelist.invalidAddress';
const loadingLabel = 'page.selectToAddress.resolvingAddress';
type TestAccount = {
  address: string;
  alianName: string;
  type: string;
  brandName: string;
};
let accounts: TestAccount[] = [];

function pendingLookup() {
  let resolveResult!: (result: { addr: string; name: string } | null) => void;
  let rejectResult!: (reason: Error) => void;
  const promise = new Promise<{ addr: string; name: string } | null>(
    (resolve, reject) => {
      resolveResult = resolve;
      rejectResult = reject;
    }
  );
  return { promise, resolve: resolveResult, reject: rejectResult };
}

// Mount the production component and resolver hook; replace presentation and
// wallet dependencies so the test controls only network completion order.
function loadEnterAddress(): React.ComponentType<any> {
  const childrenOnly = ({ children }: any) =>
    React.createElement(React.Fragment, null, children);
  const Form = Object.assign(
    ({ children, onFinish }: any) =>
      React.createElement(
        'form',
        {
          onSubmit: (event: React.FormEvent) => {
            event.preventDefault();
            onFinish();
          },
        },
        children
      ),
    { Item: childrenOnly }
  );
  const wallet = {};
  const fetchAllAccounts = jest.fn();
  const modules: Record<string, unknown> = {
    react: React,
    'react-i18next': { useTranslation: () => ({ t: (key: string) => key }) },
    antd: {
      Form,
      Input: {
        TextArea: React.forwardRef<HTMLTextAreaElement, any>(
          ({ value, onChange, onFocus, onBlur, onPaste }, ref) =>
            React.createElement('textarea', {
              value,
              onChange,
              onFocus,
              onBlur,
              onPaste,
              ref,
            })
        ),
      },
      Button: ({ children, disabled, htmlType }: any) =>
        React.createElement('button', { disabled, type: htmlType }, children),
      Spin: () => null,
    },
    '@ethereumjs/util': { isValidAddress },
    lodash: { flatten: (values: unknown[][]) => values.flat() },
    'styled-components': {
      __esModule: true,
      default: {
        div: () => ({ children, onClick }: any) =>
          React.createElement('div', { onClick }, children),
      },
    },
    clsx: { __esModule: true, default: () => '' },
    'ui/utils': {
      useWallet: () => wallet,
      isSameAddress: (a: string, b: string) =>
        a.toLowerCase() === b.toLowerCase(),
      useAlias: () => [],
      useCexId: () => [],
    },
    '@/ui/assets/component/IconClear': { IconClearCC: () => null },
    '@/ui/assets/warning-cc.svg': { ReactComponent: () => null },
    '@/ui/hooks/useEnsInputResolver': { useEnsInputResolver },
    './AccountList': {
      AccountList: ({ list, onChange }: any) =>
        React.createElement(
          'div',
          null,
          list.map((account: TestAccount) =>
            React.createElement(
              'button',
              {
                key: account.address,
                type: 'button',
                'data-account-address': account.address,
                onClick: () => onChange(account),
              },
              account.alianName
            )
          )
        ),
    },
    '@/ui/hooks/useAccounts': {
      useAccounts: () => ({
        fetchAllAccounts,
        allSortedAccountList: [accounts],
      }),
    },
    '@/ui/component/AddressRiskAlert': { AddressTypeCard: () => null },
    '@/constant': { KEYRING_TYPE: { WatchAddressKeyring: 'Watch Address' } },
    '@/ui/utils/address': { ellipsisAddress: (address: string) => address },
    '@/ui/state/whitelist': { useWhitelistStore: () => [] },
    '@/ui/utils/addressInput': {
      getNormalizedAddressInputAfterPaste: () => null,
    },
  };
  const compiled = transpileModule(
    readFileSync(
      resolve(
        __dirname,
        '../../src/ui/views/SelectToAddress/components/EnterAddress.tsx'
      ),
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
  runInNewContext(compiled, {
    exports,
    document,
    setTimeout: (...args: Parameters<typeof setTimeout>) => setTimeout(...args),
    clearTimeout: (timer: ReturnType<typeof setTimeout>) => clearTimeout(timer),
    require: (name: string) => {
      if (!(name in modules)) {
        throw new Error(`Missing test dependency ${name}`);
      }
      return modules[name];
    },
  });
  return exports.EnterAddress;
}

describe('send address ENS lookup', () => {
  const EnterAddress = loadEnterAddress();
  const reactActEnvironment = globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT?: boolean;
  };
  let root: Root;
  let container: HTMLDivElement;
  let onNext: jest.Mock;

  const input = () => container.querySelector('textarea')!;
  const confirm = () =>
    container.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const changeInput = (value: string) => {
    act(() => Simulate.change(input(), { target: { value } } as any));
  };
  const startLookup = () => act(() => jest.advanceTimersByTime(300));
  const submit = () => {
    act(() => Simulate.submit(container.querySelector('form')!));
  };
  const expectPending = () => {
    expect(container.querySelector('[role="status"]')?.textContent).toBe(
      loadingLabel
    );
    expect(container.textContent).not.toContain(invalidLabel);
    expect(confirm().disabled).toBe(true);
  };

  beforeEach(() => {
    jest.useFakeTimers();
    resolveEns.mockReset();
    accounts = [];
    reactActEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    onNext = jest.fn();
    act(() => {
      root.render(
        React.createElement(EnterAddress, {
          onNext,
          onCancel: jest.fn(),
        })
      );
    });
    // The production footer appears after its layout animation.
    act(() => jest.advanceTimersByTime(300));
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    jest.useRealTimers();
    delete reactActEnvironment.IS_REACT_ACT_ENVIRONMENT;
  });

  test.each(['hong', '0x1234'])(
    'does not start ENS lookups or show loading for %s',
    async (value) => {
      changeInput(value);
      expect(container.querySelector('[role="status"]')).toBeNull();
      expect(confirm().disabled).toBe(true);

      await act(async () => jest.advanceTimersByTime(10000));
      expect(resolveEns).not.toHaveBeenCalled();
      expect(container.querySelector('[role="status"]')).toBeNull();
      expect(confirm().disabled).toBe(true);
      submit();
      expect(onNext).not.toHaveBeenCalled();
    }
  );

  test('keeps matching local aliases selectable without ENS loading or an invalid-address error', async () => {
    accounts = [
      {
        address: ADDRESS_A,
        alianName: 'hong wallet',
        type: 'Watch Address',
        brandName: 'Watch Address',
      },
      {
        address: ADDRESS_B,
        alianName: 'another wallet',
        type: 'Watch Address',
        brandName: 'Watch Address',
      },
    ];
    changeInput('hong');
    await act(async () => jest.advanceTimersByTime(10000));

    expect(resolveEns).not.toHaveBeenCalled();
    expect(container.querySelector('[role="status"]')).toBeNull();
    expect(container.textContent).not.toContain(invalidLabel);
    expect(confirm().disabled).toBe(true);
    const accountButton = container.querySelector<HTMLButtonElement>(
      `[data-account-address="${ADDRESS_A}"]`
    );
    expect(accountButton?.textContent).toBe('hong wallet');
    expect(
      container.querySelector(`[data-account-address="${ADDRESS_B}"]`)
    ).toBeNull();
    act(() => accountButton!.click());
    expect(onNext).toHaveBeenCalledWith(ADDRESS_A, 'Watch Address');
  });

  test('ignores an ENS result after switching to a plain search term', async () => {
    const lookup = pendingLookup();
    resolveEns.mockReturnValueOnce(lookup.promise);
    changeInput('alice.eth');
    startLookup();
    expectPending();

    changeInput('hong');
    expect(container.querySelector('[role="status"]')).toBeNull();
    await act(async () => {
      lookup.resolve({ addr: ADDRESS_A, name: 'alice.eth' });
      jest.advanceTimersByTime(10000);
    });
    expect(resolveEns).toHaveBeenCalledTimes(1);
    expect(input().value).toBe('hong');
    expect(container.textContent).not.toContain(ADDRESS_A);
    expect(container.querySelector('[role="status"]')).toBeNull();
    expect(confirm().disabled).toBe(true);
    submit();
    expect(onNext).not.toHaveBeenCalled();
  });

  test('shows loading instead of invalid during a slow lookup and submits its resolved address', async () => {
    const lookup = pendingLookup();
    resolveEns.mockReturnValueOnce(lookup.promise);
    changeInput('janbenes.zk.money');
    expectPending();
    startLookup();
    act(() => jest.advanceTimersByTime(10000));
    expectPending();
    submit();
    expect(onNext).not.toHaveBeenCalled();

    await act(async () => {
      lookup.resolve({ addr: ADDRESS_A, name: 'janbenes.zk.money' });
    });
    expect(container.querySelector('[role="status"]')).toBeNull();
    expect(container.textContent).not.toContain(invalidLabel);
    expect(container.textContent).toContain(ADDRESS_A);
    expect(confirm().disabled).toBe(false);
    act(() => confirm().click());
    expect(onNext).toHaveBeenCalledWith(ADDRESS_A);
  });

  test('hides a resolved address immediately after an edit and waits for the current lookup before reporting invalid', async () => {
    resolveEns.mockResolvedValueOnce({ addr: ADDRESS_A, name: 'alice.eth' });
    changeInput('alice.eth');
    await act(async () => jest.advanceTimersByTime(300));
    expect(container.textContent).toContain(ADDRESS_A);

    const lookup = pendingLookup();
    resolveEns.mockReturnValueOnce(lookup.promise);
    changeInput('alice.et');
    expect(container.textContent).not.toContain(ADDRESS_A);
    expectPending();
    submit();
    expect(onNext).not.toHaveBeenCalled();
    startLookup();
    await act(async () => lookup.resolve(null));
    expect(container.querySelector('[role="status"]')).toBeNull();
    expect(container.textContent).toContain(invalidLabel);
    expect(confirm().disabled).toBe(true);
    submit();
    expect(onNext).not.toHaveBeenCalled();
  });

  test.each(['success', 'failure'])(
    'ignores an earlier lookup %s while the current name is pending',
    async (outcome) => {
      const first = pendingLookup();
      const second = pendingLookup();
      resolveEns
        .mockReturnValueOnce(first.promise)
        .mockReturnValueOnce(second.promise);
      changeInput('alice.eth');
      startLookup();
      changeInput('bob.eth');
      startLookup();

      await act(async () => {
        if (outcome === 'success') {
          first.resolve({ addr: ADDRESS_A, name: 'alice.eth' });
        } else {
          first.reject(new Error('lookup failed'));
        }
      });
      expectPending();
      expect(container.textContent).not.toContain(ADDRESS_A);
      expect(input().value).toBe('bob.eth');
      submit();
      expect(onNext).not.toHaveBeenCalled();

      await act(async () => {
        second.resolve({ addr: ADDRESS_B, name: 'bob.eth' });
      });
      expect(container.textContent).toContain(ADDRESS_B);
      expect(confirm().disabled).toBe(false);
      act(() => confirm().click());
      expect(onNext).toHaveBeenCalledTimes(1);
      expect(onNext).toHaveBeenCalledWith(ADDRESS_B);
    }
  );
});
