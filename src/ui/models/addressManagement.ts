import { createModel } from '@rematch/core';

import { RootModel } from '.';
import { Account, IHighlightedAddress } from '@/background/service/preference';
import store from '../store';

type IState = {
  highlightedAddresses: IHighlightedAddress[];
};

export const addressManagement = createModel<RootModel>()({
  name: 'addressManagement',
  state: {
    highlightedAddresses: [],
  } as IState,
  reducers: {
    setField(state, payload: Partial<typeof state>) {
      return Object.keys(payload).reduce(
        (accu, key) => {
          accu[key] = payload[key];
          return accu;
        },
        { ...state }
      );
    },
  },
  effects: (dispatch) => ({
    async getHilightedAddressesAsync(_: void, store) {
      const addrs = await store.app.wallet.getHighlightedAddresses();

      dispatch.addressManagement.setField({
        highlightedAddresses: addrs,
      });
    },

    async toggleHighlightedAddressAsync(
      payload: {
        brandName: Account['brandName'];
        address: Account['address'];
        nextPinned?: boolean;
      },
      store
    ) {
      const { highlightedAddresses } = store.addressManagement;
      const {
        nextPinned = !highlightedAddresses.some(
          (highlighted) =>
            highlighted.address === payload.address &&
            highlighted.brandName === payload.brandName
        ),
      } = payload;

      const addrs = [...highlightedAddresses];
      const newItem = {
        brandName: payload.brandName,
        address: payload.address,
      };
      if (nextPinned) {
        addrs.unshift(newItem);
        await store.app.wallet.updateHighlightedAddresses(addrs);
      } else {
        const toggleIdx = addrs.findIndex(
          (addr) =>
            addr.brandName === payload.brandName &&
            addr.address === payload.address
        );
        if (toggleIdx > -1) {
          addrs.splice(toggleIdx, 1);
        }
        await store.app.wallet.updateHighlightedAddresses(addrs);
      }

      dispatch.addressManagement.setField({
        highlightedAddresses: addrs,
      });
      dispatch.addressManagement.getHilightedAddressesAsync();
    },

    async removeAddress(
      payload: Parameters<typeof store.app.wallet.removeAddress>,
      store
    ) {
      await store.app.wallet.removeAddress(...payload);
      await dispatch.accountToDisplay.getAllAccountsToDisplay();
    },
  }),
});
