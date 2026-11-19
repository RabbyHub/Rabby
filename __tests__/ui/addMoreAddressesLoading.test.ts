import React, { act, createContext, createElement } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { AddMoreAddressesFromSeedPhrase } from '@/ui/views/AddAddress/AddMoreAddressesFromSeedPhrase';

const mockViewportContext = createContext(false);
let mockVisibleIndexes = new Set<number>();
const mockLoadBalance = jest.fn();
const mockBalanceLoader = { load: mockLoadBalance };
const mockFetchAccountsInfo = jest.fn();
const mockInvokePassphrase = jest.fn();
const mockOpenSuccessPage = jest.fn();
const mockDispatch = { account: { getCurrentAccountAsync: jest.fn() } };
const mockHistory = { length: 1, push: jest.fn(), goBack: jest.fn() };
const mockLocation = { search: '', state: undefined };
const mockWallet = {
  openapi: {
    usedChainList: jest.fn(),
    getTotalBalance: jest.fn(),
    getAppChainList: jest.fn(),
  },
  getMnemonicKeyRingIdFromPublicKey: jest.fn(),
  requestKeyring: jest.fn(),
  getAlianName: jest.fn(),
};
const addressAt = (index: number) =>
  `0x${index.toString(16).padStart(40, '0')}`;
const mockImportStore = {
  switchKeyring: jest.fn(),
  getAccounts: jest.fn(),
  getImportedAccounts: jest.fn(),
  setSelectedAccounts: jest.fn(),
  confirmAllImportingAccountsAsync: jest.fn(),
};

jest.mock('@/constant', () => ({ KEYRING_CLASS: { MNEMONIC: 'mnemonic' } }));
jest.mock('@/ui/utils', () => ({ useWallet: () => mockWallet }));
jest.mock('@/ui/utils/address', () => ({
  ellipsisAddress: (address: string) => address,
}));
jest.mock('@/ui/store', () => ({ useRabbyDispatch: () => mockDispatch }));
jest.mock('@/ui/hooks/useEnterPassphraseModal', () => ({
  useEnterPassphraseModal: () => mockInvokePassphrase,
}));
jest.mock('@/ui/hooks/usePopupContainer', () => ({
  usePopupContainer: () => ({ getContainer: undefined }),
}));
jest.mock('@/ui/state/importMnemonics', () => ({
  useImportMnemonicsStore: { getState: () => mockImportStore },
}));
jest.mock('@/ui/views/AddAddress/useCreateAddress', () => ({
  useCreateAddressActions: () => ({ openSuccessPage: mockOpenSuccessPage }),
  CREATE_ADDRESS_SUCCESS_PATH: '/success',
}));
jest.mock('@/ui/views/HDManager/AdvancedSettings', () => ({
  DEFAULT_SETTING_DATA: { startNo: 1 },
  MAX_ACCOUNT_COUNT: 50,
}));
jest.mock('@/ui/views/HDManager/HDPathTypeButton', () => ({
  HDPathType: { BIP44: 'bip44', LedgerLive: 'ledger', Legacy: 'legacy' },
}));
jest.mock('@/ui/views/HDManager/utils', () => ({
  fetchAccountsInfo: (...args: unknown[]) => mockFetchAccountsInfo(...args),
}));
jest.mock('@/ui/utils/addressBalanceLoader', () => ({
  createAddressBalanceLoader: () => mockBalanceLoader,
}));
jest.mock('react-router-dom', () => ({
  useHistory: () => mockHistory,
  useLocation: () => mockLocation,
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
jest.mock('antd', () => ({
  Button: ({ children, disabled, onClick }: any) =>
    React.createElement('button', { disabled, onClick }, children),
  message: { error: jest.fn() },
}));
jest.mock('@/ui/component', () => ({
  PageHeader: ({ children, rightSlot }: any) =>
    React.createElement('header', null, children, rightSlot),
  Popup: ({ visible, children }: any) =>
    visible ? React.createElement('div', { role: 'dialog' }, children) : null,
}));
jest.mock('@/ui/assets/add-address', () => ({
  RcAddMoreAddressesSettingIcon: () => null,
  RcAddMoreAddressesSettingCenterIcon: () => null,
  RcAddMoreAddressesCheckedIcon: () => null,
  RcAddMoreAddressesCheckmarkIcon: () => null,
  RcAddMoreAddressesUncheckedIcon: () => null,
  RcAddMoreAddressesSheetOuterIcon: () => null,
  RcAddMoreAddressesSheetInnerIcon: () => null,
  RcAddMoreAddressesSheetUncheckedIcon: () => null,
}));
jest.mock('react-virtuoso', () => ({
  Virtuoso: ({ data, itemContent, computeItemKey }: any) => {
    // Mount a small rendered range, including offscreen overscan rows.
    return React.createElement(
      'div',
      { 'data-list-size': data.length },
      data.slice(0, 3).map((item: any, index: number) =>
        React.createElement(
          mockViewportContext.Provider,
          {
            key: computeItemKey(index, item),
            value: mockVisibleIndexes.has(index),
          },
          React.createElement(
            'div',
            { 'data-row': index },
            itemContent(index, item)
          )
        )
      )
    );
  },
}));

describe('add more addresses loading', () => {
  let root: Root;
  let container: HTMLDivElement;
  const previousActEnvironment = (globalThis as any).IS_REACT_ACT_ENVIRONMENT;

  beforeAll(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  });
  beforeEach(() => {
    jest.clearAllMocks();
    mockVisibleIndexes = new Set();
    mockInvokePassphrase.mockResolvedValue(undefined);
    mockWallet.getMnemonicKeyRingIdFromPublicKey.mockResolvedValue(1);
    mockWallet.getAlianName.mockResolvedValue('');
    mockDispatch.account.getCurrentAccountAsync.mockResolvedValue(undefined);
    mockWallet.requestKeyring.mockImplementation(async (_type, method) =>
      method === 'getMaxAccountLimit' ? 50 : undefined
    );
    mockImportStore.getAccounts.mockImplementation(async ({ start, end }) =>
      Array.from({ length: end - start }, (_, index) => ({
        address: addressAt(start + index),
        index: start + index + 1,
      }))
    );
    mockImportStore.getImportedAccounts.mockResolvedValue([
      { address: addressAt(0), index: 1 },
    ]);
    mockImportStore.setSelectedAccounts.mockResolvedValue(undefined);
    mockImportStore.confirmAllImportingAccountsAsync.mockResolvedValue(
      undefined
    );
    mockLoadBalance.mockImplementation(() => new Promise(() => undefined));
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

  const render = async () => {
    await act(async () => {
      root.render(
        createElement(AddMoreAddressesFromSeedPhrase, {
          state: { publicKey: 'test-public-key' },
        })
      );
    });
  };
  const rowButton = (index: number) =>
    container.querySelector(
      `[data-row="${index}"] button`
    ) as HTMLButtonElement;
  const confirmButton = () =>
    Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent === 'global.confirm'
    )!;

  it('shows and allows selecting derived addresses without fetching offscreen amounts', async () => {
    await render();

    expect(container.querySelector('[data-list-size="50"]')).not.toBeNull();
    expect(mockImportStore.getAccounts).toHaveBeenCalledTimes(10);
    expect(rowButton(1).textContent).toContain(addressAt(1));
    expect(rowButton(0).disabled).toBe(true);
    expect(confirmButton().disabled).toBe(true);
    expect(mockFetchAccountsInfo).not.toHaveBeenCalled();
    expect(mockWallet.openapi.usedChainList).not.toHaveBeenCalled();
    expect(mockWallet.openapi.getTotalBalance).not.toHaveBeenCalled();
    expect(mockWallet.openapi.getAppChainList).not.toHaveBeenCalled();
    expect(mockLoadBalance).not.toHaveBeenCalled();

    act(() => rowButton(1).click());
    expect(confirmButton().disabled).toBe(false);
  });

  it('loads only the visible row and keeps confirmation available during balance loading or failure', async () => {
    let rejectBalance!: (reason: Error) => void;
    mockLoadBalance.mockImplementation(
      () =>
        new Promise<number>((_resolve, reject) => {
          rejectBalance = reject;
        })
    );
    await render();
    mockVisibleIndexes = new Set([1]);
    await render();

    expect(mockLoadBalance).toHaveBeenCalledTimes(1);
    expect(mockLoadBalance.mock.calls[0][0]).toBe(addressAt(1));
    expect(rowButton(1).querySelector('[aria-busy="true"]')).not.toBeNull();
    act(() => rowButton(1).click());
    expect(confirmButton().disabled).toBe(false);

    await act(async () => rejectBalance(new Error('HTTP 429')));
    expect(rowButton(1).textContent).toContain('—');
    expect(rowButton(1).textContent).not.toContain('$0.00');
    expect(confirmButton().disabled).toBe(false);
    expect(mockLoadBalance).toHaveBeenCalledTimes(1);

    await act(async () => confirmButton().click());
    expect(mockImportStore.setSelectedAccounts).toHaveBeenCalledWith([
      addressAt(1),
    ]);
    expect(
      mockImportStore.confirmAllImportingAccountsAsync
    ).toHaveBeenCalledTimes(1);
    expect(mockOpenSuccessPage).toHaveBeenCalledWith(
      expect.objectContaining({
        addresses: [{ address: addressAt(1), alias: '' }],
      })
    );
  });

  it('clears the previous selection when loading addresses for new settings fails', async () => {
    await render();
    act(() => rowButton(1).click());
    expect(confirmButton().disabled).toBe(false);

    act(() =>
      (container.querySelector('header button') as HTMLButtonElement).click()
    );
    const dialog = container.querySelector('[role="dialog"]')!;
    const settingButtons = Array.from(dialog.querySelectorAll('button'));
    act(() =>
      settingButtons
        .find((button) => button.textContent?.includes('Ledger Live'))!
        .click()
    );
    mockImportStore.getAccounts.mockRejectedValueOnce(
      new Error('Failed to derive addresses')
    );
    await act(async () =>
      settingButtons
        .find((button) => button.textContent === 'global.confirm')!
        .click()
    );

    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(container.querySelector('[data-list-size="0"]')).not.toBeNull();
    expect(confirmButton().disabled).toBe(true);
    act(() => confirmButton().click());
    expect(mockImportStore.setSelectedAccounts).not.toHaveBeenCalled();
    expect(
      mockImportStore.confirmAllImportingAccountsAsync
    ).not.toHaveBeenCalled();
    expect(mockOpenSuccessPage).not.toHaveBeenCalled();
  });
});
