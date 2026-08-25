import type { Account } from '@/background/service/preference';
import {
  getDefaultAccountState,
  selectIsLoadingMatteredChainBalances,
  useAccountStore,
} from '@/ui/state/account';
import { wallet } from '@/ui/wallet';

jest.mock('@/ui/wallet', () => ({
  wallet: {
    addBlockedToken: jest.fn(),
    addCustomizedToken: jest.fn(),
    changeAccount: jest.fn(),
    getAddressCacheBalance: jest.fn(),
    getCurrentAccount: jest.fn(),
    getPreference: jest.fn(),
    removeBlockedToken: jest.fn(),
    removeCustomizedToken: jest.fn(),
    switchSceneAccount: jest.fn(),
  },
}));

const currentAccount: Account = {
  address: '0x0000000000000000000000000000000000000001',
  type: 'Simple Key Pair',
  brandName: 'Rabby',
};

describe('account store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAccountStore.setState(getDefaultAccountState());
  });

  test('keeps account view state in a non-persisted Zustand store', () => {
    expect(useAccountStore.getState().currentAccount).toBeNull();
    expect('persist' in useAccountStore).toBe(false);
  });

  test('loads the current account', async () => {
    (wallet.getCurrentAccount as jest.Mock).mockResolvedValue(currentAccount);

    await expect(
      useAccountStore.getState().getCurrentAccountAsync()
    ).resolves.toEqual(currentAccount);
    expect(useAccountStore.getState().currentAccount).toEqual(currentAccount);
  });

  test('updates a scene account only after the background accepts it', async () => {
    (wallet.switchSceneAccount as jest.Mock).mockResolvedValue(undefined);

    await useAccountStore.getState().switchSceneAccount({
      scene: 'lending',
      account: currentAccount,
    });

    expect(wallet.switchSceneAccount).toHaveBeenCalledWith({
      scene: 'lending',
      account: currentAccount,
    });
    expect(useAccountStore.getState().sceneAccountMap.lending).toEqual(
      currentAccount
    );
  });

  test('does not switch local state when the background rejects an account change', async () => {
    const nextAccount: Account = {
      ...currentAccount,
      address: '0x0000000000000000000000000000000000000002',
    };
    useAccountStore.setState({ currentAccount });
    (wallet.changeAccount as jest.Mock).mockRejectedValue(
      new Error('change rejected')
    );

    await expect(
      useAccountStore.getState().changeAccountAsync(nextAccount)
    ).rejects.toThrow('change rejected');
    expect(useAccountStore.getState().currentAccount).toEqual(currentAccount);
  });

  test('exposes mattered-balance loading state while the request is pending', async () => {
    let resolveBalance!: (value: { chain_list: [] }) => void;
    (wallet.getAddressCacheBalance as jest.Mock).mockReturnValue(
      new Promise((resolve) => {
        resolveBalance = resolve;
      })
    );

    const request = useAccountStore
      .getState()
      .getMatteredChainBalance({
        currentAccountAddress: currentAccount.address,
      });

    expect(
      selectIsLoadingMatteredChainBalances(useAccountStore.getState())
    ).toBe(true);

    resolveBalance({ chain_list: [] });
    await expect(request).resolves.toEqual({
      matteredChainBalances: {},
      testnetMatteredChainBalances: {},
    });
    expect(
      selectIsLoadingMatteredChainBalances(useAccountStore.getState())
    ).toBe(false);
  });
});
