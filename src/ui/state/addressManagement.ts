import { create } from 'zustand';

import type {
  Account,
  IHighlightedAddress,
} from '@/background/service/preference';
import { useAccountToDisplayStore } from '@/ui/state/accountToDisplay';
import { wallet } from '@/ui/wallet';

export type AddressManagementState = {
  highlightedAddresses: IHighlightedAddress[];
};

export type AddressManagementActions = {
  getHilightedAddressesAsync: () => Promise<void>;
  toggleHighlightedAddressAsync: (payload: {
    brandName: Account['brandName'];
    address: Account['address'];
    nextPinned?: boolean;
  }) => Promise<void>;
  removeAddress: (
    payload: Parameters<typeof wallet.removeAddress>
  ) => Promise<void>;
};

export type AddressManagementStore = AddressManagementState &
  AddressManagementActions;

export const getDefaultAddressManagementState = (): AddressManagementState => ({
  highlightedAddresses: [],
});

export const useAddressManagementStore = create<AddressManagementStore>()(
  (set, get) => ({
    ...getDefaultAddressManagementState(),

    async getHilightedAddressesAsync() {
      const highlightedAddresses = await wallet.getHighlightedAddresses();
      set({ highlightedAddresses });
    },

    async toggleHighlightedAddressAsync(payload) {
      const highlightedAddresses = get().highlightedAddresses;
      const nextPinned =
        payload.nextPinned ??
        !highlightedAddresses.some(
          (highlighted) =>
            highlighted.address === payload.address &&
            highlighted.brandName === payload.brandName
        );
      const nextHighlightedAddresses = [...highlightedAddresses];

      if (nextPinned) {
        nextHighlightedAddresses.unshift({
          brandName: payload.brandName,
          address: payload.address,
        });
      } else {
        const toggleIndex = nextHighlightedAddresses.findIndex(
          (highlighted) =>
            highlighted.brandName === payload.brandName &&
            highlighted.address === payload.address
        );
        if (toggleIndex > -1) {
          nextHighlightedAddresses.splice(toggleIndex, 1);
        }
      }

      await wallet.updateHighlightedAddresses(nextHighlightedAddresses);
      set({ highlightedAddresses: nextHighlightedAddresses });
      void get().getHilightedAddressesAsync();
    },

    async removeAddress(payload) {
      await wallet.removeAddress(...payload);
      await useAccountToDisplayStore.getState().getAllAccountsToDisplay();
    },
  })
);

export const addressManagementActions: AddressManagementActions = new Proxy(
  {} as AddressManagementActions,
  {
    get(_target, property: keyof AddressManagementActions) {
      return useAddressManagementStore.getState()[property];
    },
  }
);
