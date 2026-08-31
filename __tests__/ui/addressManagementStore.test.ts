import type { IHighlightedAddress } from '@/background/service/preference';
import { useAccountToDisplayStore } from '@/ui/state/accountToDisplay';
import {
  getDefaultAddressManagementState,
  useAddressManagementStore,
} from '@/ui/state/addressManagement';
import { wallet } from '@/ui/wallet';

jest.mock('@/ui/wallet', () => ({
  wallet: {
    getHighlightedAddresses: jest.fn(),
    removeAddress: jest.fn(),
    updateHighlightedAddresses: jest.fn(),
  },
}));

jest.mock('@/ui/state/accountToDisplay', () => ({
  useAccountToDisplayStore: {
    getState: jest.fn(),
  },
}));

const highlightedAddress = (
  address: string,
  brandName = 'Rabby'
): IHighlightedAddress => ({ address, brandName });

describe('address-management store', () => {
  const getAllAccountsToDisplay = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useAddressManagementStore.setState(getDefaultAddressManagementState());
    (useAccountToDisplayStore.getState as jest.Mock).mockReturnValue({
      getAllAccountsToDisplay,
    });
  });

  test('keeps highlighted addresses in a non-persisted store', () => {
    expect(useAddressManagementStore.getState()).toMatchObject({
      highlightedAddresses: [],
    });
    expect('persist' in useAddressManagementStore).toBe(false);
  });

  test('loads highlighted addresses from the wallet', async () => {
    const addresses = [highlightedAddress('0xabc')];
    (wallet.getHighlightedAddresses as jest.Mock).mockResolvedValue(addresses);

    await useAddressManagementStore
      .getState()
      .getHilightedAddressesAsync();

    expect(useAddressManagementStore.getState().highlightedAddresses).toBe(
      addresses
    );
  });

  test('pins an address and refreshes the wallet-backed list', async () => {
    const existing = highlightedAddress('0xabc');
    const added = highlightedAddress('0xdef');
    useAddressManagementStore.setState({
      highlightedAddresses: [existing],
    });
    (wallet.updateHighlightedAddresses as jest.Mock).mockResolvedValue(
      undefined
    );
    (wallet.getHighlightedAddresses as jest.Mock).mockResolvedValue([
      added,
      existing,
    ]);

    await useAddressManagementStore
      .getState()
      .toggleHighlightedAddressAsync(added);

    expect(wallet.updateHighlightedAddresses).toHaveBeenCalledWith([
      added,
      existing,
    ]);
    expect(wallet.getHighlightedAddresses).toHaveBeenCalledTimes(1);
  });

  test('honors an explicit unpin request', async () => {
    const removed = highlightedAddress('0xabc');
    const remaining = highlightedAddress('0xdef');
    useAddressManagementStore.setState({
      highlightedAddresses: [removed, remaining],
    });
    (wallet.updateHighlightedAddresses as jest.Mock).mockResolvedValue(
      undefined
    );
    (wallet.getHighlightedAddresses as jest.Mock).mockResolvedValue([
      remaining,
    ]);

    await useAddressManagementStore
      .getState()
      .toggleHighlightedAddressAsync({ ...removed, nextPinned: false });

    expect(wallet.updateHighlightedAddresses).toHaveBeenCalledWith([
      remaining,
    ]);
  });

  test('removes an address before refreshing displayed accounts', async () => {
    (wallet.removeAddress as jest.Mock).mockResolvedValue(undefined);
    getAllAccountsToDisplay.mockResolvedValue(undefined);

    await useAddressManagementStore
      .getState()
      .removeAddress(['0xabc', 'Watch Address', 'Rabby', true]);

    expect(wallet.removeAddress).toHaveBeenCalledWith(
      '0xabc',
      'Watch Address',
      'Rabby',
      true
    );
    expect(getAllAccountsToDisplay).toHaveBeenCalledTimes(1);
    expect(
      (wallet.removeAddress as jest.Mock).mock.invocationCallOrder[0]
    ).toBeLessThan(getAllAccountsToDisplay.mock.invocationCallOrder[0]);
  });
});
