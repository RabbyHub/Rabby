import { Account } from '@/background/service/preference';
import { createModel } from '@rematch/core';

import { RootModel } from '.';

type IState = {
  highlightedAddresses: Set<string>;
};

export const viewDashboard = createModel<RootModel>()({
  name: 'viewDashboard',
  state: {
    highlightedAddresses: new Set(),
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
    async getHilightedAddressesAsync(_?, store?) {
      const addrs = await store.app.wallet.getHighlightedAddresses();
      dispatch.viewDashboard.setField({
        highlightedAddresses: new Set(addrs),
      });
    },

    async toggleHighlightedAddressAsync(
      payload: { address: string; nextPinned?: boolean },
      store?
    ) {
      const { highlightedAddresses } = store.viewDashboard;
      const {
        address,
        nextPinned = !highlightedAddresses.has(address),
      } = payload;

      if (nextPinned) {
        highlightedAddresses.add(payload.address);
      } else {
        highlightedAddresses.delete(payload.address);
      }

      const addrs = [...highlightedAddresses];
      await store.app.wallet.updateHighlightedAddresses(addrs);
      dispatch.viewDashboard.setField({
        highlightedAddresses: new Set(addrs),
      });
      dispatch.viewDashboard.getHilightedAddressesAsync();
    },
  }),
});
