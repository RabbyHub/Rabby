import type { DisplayedKeryring } from '@/background/service/keyring';
import {
  getDefaultAccountToDisplayState,
  useAccountToDisplayStore,
} from '@/ui/state/accountToDisplay';
import { wallet } from '@/ui/wallet';

jest.mock('@/ui/wallet', () => ({
  wallet: {
    getAddressCacheBalance: jest.fn(),
    getAllAlianNameByMap: jest.fn(),
    getAllVisibleAccounts: jest.fn(),
    getInMemoryAddressBalance: jest.fn(),
    requestKeyring: jest.fn(),
  },
}));

const keyring = (accounts: DisplayedKeryring['accounts'][number][]) =>
  ({
    type: 'HD Key Tree',
    accounts,
    keyring: {} as DisplayedKeryring['keyring'],
    byImport: true,
    publicKey: 'public-key',
  } as DisplayedKeryring);

describe('account-to-display store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAccountToDisplayStore.setState(getDefaultAccountToDisplayState());
  });

  test('keeps derived account display data in a non-persisted store', () => {
    expect(useAccountToDisplayStore.getState()).toMatchObject({
      loadingAccounts: false,
      accountsList: [],
    });
    expect('persist' in useAccountToDisplayStore).toBe(false);
  });

  test('loads, enriches, normalizes, and sorts visible accounts', async () => {
    (wallet.getAllVisibleAccounts as jest.Mock).mockResolvedValue([
      keyring([
        { address: '0xAbC', brandName: 'Rabby' },
        { address: '0xDeF', brandName: 'Rabby' },
      ]),
    ]);
    (wallet.getAllAlianNameByMap as jest.Mock).mockResolvedValue({
      '0xabc': { name: 'Alice' },
    });
    (wallet.getAddressCacheBalance as jest.Mock).mockImplementation(
      async (address: string) => ({
        total_usd_value: address === '0xdef' ? 20 : 10,
        chain_list: [],
      })
    );
    (wallet.requestKeyring as jest.Mock).mockImplementation(
      async (
        _type: string,
        _method: string,
        _keyring: null,
        address: string
      ) => ({
        hdPathBasePublicKey: `base-${address}`,
        hdPathType: 'BIP44',
      })
    );

    await useAccountToDisplayStore.getState().getAllAccountsToDisplay();

    expect(useAccountToDisplayStore.getState().loadingAccounts).toBe(false);
    expect(useAccountToDisplayStore.getState().accountsList).toEqual([
      expect.objectContaining({
        address: '0xdef',
        balance: 20,
        type: 'HD Key Tree',
        byImport: true,
        publicKey: 'public-key',
        hdPathBasePublicKey: 'base-0xdef',
      }),
      expect.objectContaining({
        address: '0xabc',
        balance: 10,
        alianName: 'Alice',
        hdPathBasePublicKey: 'base-0xabc',
      }),
    ]);
  });

  test('clears loading state when loading visible accounts fails', async () => {
    (wallet.getAllVisibleAccounts as jest.Mock).mockRejectedValue(
      new Error('load failed')
    );
    (wallet.getAllAlianNameByMap as jest.Mock).mockResolvedValue({});

    await expect(
      useAccountToDisplayStore.getState().getAllAccountsToDisplay()
    ).rejects.toThrow('load failed');
    expect(useAccountToDisplayStore.getState().loadingAccounts).toBe(false);
  });

  test('accepts keyrings that return no account info', async () => {
    (wallet.getAllVisibleAccounts as jest.Mock).mockResolvedValue([
      keyring([{ address: '0xAbC', brandName: 'Rabby' }]),
    ]);
    (wallet.getAllAlianNameByMap as jest.Mock).mockResolvedValue({});
    (wallet.getAddressCacheBalance as jest.Mock).mockResolvedValue({
      total_usd_value: 10,
      chain_list: [],
    });
    (wallet.requestKeyring as jest.Mock).mockResolvedValue(undefined);

    await expect(
      useAccountToDisplayStore.getState().getAllAccountsToDisplay()
    ).resolves.toBeUndefined();
    expect(useAccountToDisplayStore.getState().accountsList).toEqual([
      expect.objectContaining({
        address: '0xabc',
        balance: 10,
        hdPathBasePublicKey: undefined,
        hdPathType: undefined,
      }),
    ]);
  });

  test('keeps failed balances while applying successful balance updates', async () => {
    useAccountToDisplayStore.setState({
      accountsList: [
        {
          address: '0xabc',
          brandName: 'Rabby',
          type: 'HD Key Tree',
          keyring: {} as never,
          alianName: '',
          balance: 1,
        },
        {
          address: '0xdef',
          brandName: 'Rabby',
          type: 'HD Key Tree',
          keyring: {} as never,
          alianName: '',
          balance: 2,
        },
      ],
    });
    (wallet.getInMemoryAddressBalance as jest.Mock).mockImplementation(
      async (address: string) => {
        if (address === '0xdef') throw new Error('balance failed');
        return { total_usd_value: 11, chain_list: [] };
      }
    );

    await expect(
      useAccountToDisplayStore.getState().updateAllBalance()
    ).rejects.toThrow('update balance error');
    expect(
      useAccountToDisplayStore
        .getState()
        .accountsList.map(({ address, balance }) => ({ address, balance }))
    ).toEqual([
      { address: '0xabc', balance: 11 },
      { address: '0xdef', balance: 2 },
    ]);
  });
});
