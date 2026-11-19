import React, { act, createContext, createElement } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { AccountList } from '@/ui/views/HDManager/AccountList';
import type { Account } from '@/ui/views/HDManager/AccountList';

const mockViewportContext = createContext(false);
let mockVisibleIndexes = new Set<number>();
let mockAccountsMap: Record<string, Account> = {};
let mockPendingMap: Record<string, boolean> = {};
const mockCreateQueryAccountJob = jest.fn();
const mockWallet = {};

jest.mock('@/ui/utils', () => ({
  useWallet: () => mockWallet,
  isSameAddress: (a: string, b: string) => a.toLowerCase() === b.toLowerCase(),
  splitNumberByStep: jest.requireActual('@/ui/utils/number').splitNumberByStep,
}));
jest.mock('@/ui/utils/os', () => ({ detectClientOS: () => 'macOS' }));
jest.mock('@/constant', () => ({
  KEYRING_CLASS: {
    MNEMONIC: 'mnemonic',
    HARDWARE: { KEYSTONE: 'keystone', GRIDPLUS: 'gridplus' },
  },
  HARDWARE_KEYRING_TYPES: {},
}));
jest.mock('@/ui/state/importMnemonics', () => ({
  useImportMnemonicsStore: { getState: () => ({}) },
}));
jest.mock('@/utils/account', () => ({ generateAliasName: jest.fn() }));
jest.mock('@/ui/views/HDManager/utils', () => ({
  HDManagerStateContext: React.createContext({
    currentAccounts: [],
    selectedAccounts: [],
    keyring: 'ledger',
    tab: 'rabby',
    isLazyImport: false,
  }),
}));
jest.mock('@/ui/views/HDManager/hooks/useQueryAccontsInfo', () => ({
  useQueryAccountsInfo: () => ({
    accountsMap: mockAccountsMap,
    pendingMap: mockPendingMap,
    createQueryAccountJob: mockCreateQueryAccountJob,
  }),
}));
jest.mock('@/ui/views/HDManager/AdvancedSettings', () => ({
  MAX_ACCOUNT_COUNT: 50,
}));
jest.mock('@/ui/views/HDManager/AddToRabby', () => ({
  AddToRabby: () => null,
}));
jest.mock('@/ui/views/HDManager/AliasName', () => ({ AliasName: () => null }));
jest.mock('@/ui/views/HDManager/ChainList', () => ({
  ChainList: () => React.createElement('span', null, 'chains'),
}));
jest.mock('@/ui/views/HDManager/AccountListSkeleton', () => ({
  AccountListSkeleton: () =>
    React.createElement('span', { 'data-loading': true }, 'loading'),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('ahooks', () => ({
  useMemoizedFn: (fn: (...args: any[]) => unknown) => {
    const ref = React.useRef(fn);
    ref.current = fn;
    return React.useCallback((...args: unknown[]) => ref.current(...args), []);
  },
  useInViewport: () => [React.useContext(mockViewportContext)],
}));
jest.mock('antd', () => {
  const flattenColumns = (children: React.ReactNode): React.ReactElement[] =>
    React.Children.toArray(children).flatMap((child) => {
      const column = child as React.ReactElement;
      return column.props.children
        ? flattenColumns(column.props.children)
        : [column];
    });
  const Table = ({ dataSource, children, rowKey }: any) => {
    const columns = flattenColumns(children).filter((column) =>
      ['balance', 'usedChains', 'firstTxTime'].includes(column.props.dataIndex)
    );
    return React.createElement(
      'table',
      null,
      React.createElement(
        'tbody',
        null,
        dataSource.map((record: Account, rowIndex: number) =>
          React.createElement(
            mockViewportContext.Provider,
            {
              key: rowKey(record),
              value: mockVisibleIndexes.has(record.index),
            },
            React.createElement(
              'tr',
              { 'data-row-index': record.index },
              columns.map((column) =>
                React.createElement(
                  'td',
                  {
                    key: column.props.dataIndex,
                    'data-column': column.props.dataIndex,
                  },
                  column.props.render(
                    record[column.props.dataIndex],
                    record,
                    rowIndex
                  )
                )
              )
            )
          )
        )
      )
    );
  };
  Table.Column = () => null;
  Table.ColumnGroup = () => null;
  return { Table, message: { success: jest.fn() } };
});

describe('HDManager balance column', () => {
  const address = `0xAbC${'0'.repeat(36)}1`;
  const record: Account = { address, index: 1 };
  const previousActEnvironment = (globalThis as any).IS_REACT_ACT_ENVIRONMENT;
  let root: Root;
  let container: HTMLDivElement;

  beforeAll(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  });
  beforeEach(() => {
    jest.clearAllMocks();
    mockVisibleIndexes = new Set();
    mockAccountsMap = {};
    mockPendingMap = {};
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });
  afterAll(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
  });

  const render = async (data: Account[] = [record]) => {
    await act(async () => {
      root.render(createElement(AccountList, { loading: false, data }));
    });
  };
  const cell = (column: string) =>
    container.querySelector(`[data-row-index="1"] [data-column="${column}"]`)!;

  it('shows AppChain-only assets from a lowercase cache key while used chains stay empty', async () => {
    mockAccountsMap[address.toLowerCase()] = {
      ...record,
      address: address.toLowerCase(),
      chains: [],
      balance: 1234.5,
    };

    await render();

    expect(cell('balance').textContent).toBe('$1,234.5');
    expect(cell('usedChains').textContent).toBe('-');
    expect(cell('firstTxTime').textContent).toBe('-');
    expect(mockCreateQueryAccountJob).not.toHaveBeenCalled();
  });

  it.each([
    [0, '$0'],
    [-5.25, '$-5.25'],
    [undefined, '-'],
    [NaN, '-'],
    [Infinity, '-'],
  ])(
    'renders balance %s as %s without a used-chain gate',
    async (balance, text) => {
      mockAccountsMap[address.toLowerCase()] = {
        ...record,
        chains: [],
        balance: balance as number | undefined,
      };

      await render();

      expect(cell('balance').textContent).toBe(text);
      expect(cell('usedChains').textContent).toBe('-');
    }
  );

  it('uses lowercase pending keys for the loading state', async () => {
    mockAccountsMap[address.toLowerCase()] = { ...record, balance: 25 };
    mockPendingMap[address.toLowerCase()] = true;

    await render();

    expect(cell('balance').querySelector('[data-loading]')).not.toBeNull();
    expect(cell('usedChains').querySelector('[data-loading]')).not.toBeNull();
    expect(cell('balance').textContent).not.toContain('$25');
  });

  it('queries a row only when its InViewport wrapper becomes visible', async () => {
    const data = [record];
    await render(data);
    expect(mockCreateQueryAccountJob).not.toHaveBeenCalled();

    mockVisibleIndexes.add(1);
    await render(data);
    expect(mockCreateQueryAccountJob).toHaveBeenCalledTimes(1);
    expect(mockCreateQueryAccountJob).toHaveBeenCalledWith(record);

    await render(data);
    expect(mockCreateQueryAccountJob).toHaveBeenCalledTimes(1);
    mockVisibleIndexes.clear();
    await render(data);
    expect(mockCreateQueryAccountJob).toHaveBeenCalledTimes(1);
  });

  it('queries a derived address replacing a visible placeholder at the same index', async () => {
    mockVisibleIndexes.add(1);
    await render([{ address: '', index: 1 }]);
    expect(cell('balance').querySelector('[data-loading]')).not.toBeNull();
    mockCreateQueryAccountJob.mockClear();

    await render([record]);

    expect(mockCreateQueryAccountJob).toHaveBeenCalledTimes(1);
    expect(mockCreateQueryAccountJob).toHaveBeenCalledWith(record);
  });
});
