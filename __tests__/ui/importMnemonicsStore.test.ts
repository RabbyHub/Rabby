import type { Account } from '@/background/service/preference';
import {
  getDefaultImportMnemonicsState,
  selectAccountsToImport,
  selectCountDraftSelected,
  useImportMnemonicsStore,
} from '@/ui/state/importMnemonics';
import { wallet } from '@/ui/wallet';

jest.mock('webextension-polyfill', () => ({
  storage: {
    local: {
      get: jest.fn().mockResolvedValue({}),
    },
  },
  tabs: {
    onCreated: {
      addListener: jest.fn(),
    },
  },
}));

jest.mock('@/ui/wallet', () => ({
  wallet: {
    requestKeyring: jest.fn(),
    requestHDKeyringByMnemonics: jest.fn(),
    generateAliasCacheForExistedMnemonic: jest.fn(),
    generateAliasCacheForFreshMnemonic: jest.fn(),
    getAlianName: jest.fn(),
    getCacheAlias: jest.fn(),
    addKeyring: jest.fn(),
    activeAndPersistAccountsByMnemonics: jest.fn(),
    addHDKeyRingLastAddAddrTime: jest.fn(),
    updateAlianName: jest.fn(),
  },
}));

const mockedRequestKeyring = wallet.requestKeyring as jest.Mock;
const mockedRequestHDKeyringByMnemonics = wallet.requestHDKeyringByMnemonics as jest.Mock;
const mockedGenerateFreshAliases = wallet.generateAliasCacheForFreshMnemonic as jest.Mock;
const mockedGetAlias = wallet.getAlianName as jest.Mock;
const mockedGetCachedAlias = wallet.getCacheAlias as jest.Mock;

const account = (address: string, index: number): Account =>
  ({ address, index } as Account);

describe('import mnemonics store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useImportMnemonicsStore.setState(getDefaultImportMnemonicsState());
  });

  test('keeps sensitive import state transient and derives selections', () => {
    useImportMnemonicsStore.setState({
      confirmingAccounts: [
        { address: '0x1', index: 1, alianName: 'Account 1' },
        { address: '0x2', index: 2, alianName: 'Account 2' },
      ],
      importedAddresses: new Set(['0x1']),
      draftAddressSelection: new Set(['0x1', '0x2']),
    });

    const state = useImportMnemonicsStore.getState();
    expect(selectAccountsToImport(state).map((item) => item.address)).toEqual([
      '0x2',
    ]);
    expect(selectCountDraftSelected(state)).toBe(1);
    expect(useImportMnemonicsStore).not.toHaveProperty('persist');
  });

  test('switches keyrings and rejects incomplete existing-keyring context', () => {
    expect(() =>
      useImportMnemonicsStore.getState().switchKeyring({
        isExistedKeyring: true,
        stashKeyringId: 7,
      })
    ).toThrow('finalMnemonics is required');

    useImportMnemonicsStore.getState().switchKeyring({
      finalMnemonics: 'test seed phrase',
      passphrase: 'secret',
      isExistedKeyring: true,
      stashKeyringId: 7,
    });

    expect(useImportMnemonicsStore.getState()).toMatchObject({
      finalMnemonics: 'test seed phrase',
      passphrase: 'secret',
      isExistedKeyring: true,
      stashKeyringId: 7,
      queriedAccountsByAddress: {},
      confirmingAccounts: [],
    });
  });

  test('loads fresh-keyring accounts and memorizes them by address', async () => {
    const accounts = [account('0x2', 2), account('0x1', 1)];
    mockedRequestKeyring.mockResolvedValue(accounts);
    useImportMnemonicsStore.setState({ stashKeyringId: 9 });

    await expect(
      useImportMnemonicsStore.getState().getAccounts({ start: 0, end: 2 })
    ).resolves.toEqual(accounts);

    expect(mockedRequestKeyring).toHaveBeenCalledWith(
      expect.any(String),
      'getAddresses',
      9,
      0,
      2
    );
    expect(
      useImportMnemonicsStore.getState().queriedAccountsByAddress
    ).toEqual({
      '0x1': accounts[1],
      '0x2': accounts[0],
    });
  });

  test('sorts, aliases, and confirms fresh-keyring accounts', async () => {
    useImportMnemonicsStore.setState({
      stashKeyringId: 11,
      queriedAccountsByAddress: {
        '0x1': account('0x1', 1),
        '0x2': account('0x2', 2),
      },
    });
    mockedGetAlias.mockResolvedValue(undefined);
    mockedGetCachedAlias.mockImplementation((address: string) =>
      Promise.resolve({ name: address === '0x1' ? 'First' : 'Second' })
    );
    mockedRequestKeyring.mockImplementation(
      (_type, method: string) =>
        method === 'getInfoByAddress'
          ? Promise.resolve({ basePublicKey: 'public-key' })
          : Promise.resolve(undefined)
    );

    await useImportMnemonicsStore
      .getState()
      .setSelectedAccounts(['0x2', '0x1']);

    expect(mockedGenerateFreshAliases).toHaveBeenCalledWith(11, [0, 1]);
    expect(useImportMnemonicsStore.getState().confirmingAccounts).toEqual([
      { address: '0x1', index: 1, alianName: 'First' },
      { address: '0x2', index: 2, alianName: 'Second' },
    ]);

    await useImportMnemonicsStore
      .getState()
      .confirmAllImportingAccountsAsync();

    expect(mockedRequestKeyring).toHaveBeenCalledWith(
      expect.any(String),
      'activeAccounts',
      11,
      [0, 1]
    );
    expect(wallet.addKeyring).toHaveBeenCalledWith(11);
    expect(wallet.addHDKeyRingLastAddAddrTime).toHaveBeenCalledWith(
      'public-key'
    );
    expect(wallet.updateAlianName).toHaveBeenCalledTimes(2);
  });

  test('loads existing-keyring accounts through the mnemonic bridge', async () => {
    const accounts = [account('0x1', 1)];
    mockedRequestHDKeyringByMnemonics.mockResolvedValue(accounts);
    useImportMnemonicsStore.getState().switchKeyring({
      finalMnemonics: 'test seed phrase',
      passphrase: 'secret',
      isExistedKeyring: true,
      stashKeyringId: 3,
    });

    await expect(
      useImportMnemonicsStore.getState().getAccounts({ firstFlag: true })
    ).resolves.toEqual(accounts);

    expect(mockedRequestHDKeyringByMnemonics).toHaveBeenCalledWith(
      'test seed phrase',
      'getFirstPage',
      'secret'
    );
  });
});
