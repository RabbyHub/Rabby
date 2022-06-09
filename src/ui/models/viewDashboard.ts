import BigNumber from 'bignumber.js';
import { createModel } from '@rematch/core';

import { RootModel } from '.';
import { DisplayedKeryring } from '@/background/service/keyring';

type IDisplayedAccount = Required<DisplayedKeryring['accounts'][number]>;
type IDisplayedAccountWithBalance = IDisplayedAccount & {
  balance: number;
};

type IState = {
  highlightedAddresses: Set<string>;

  loadingAddress: boolean;
  accountsList: IDisplayedAccountWithBalance[];
};

export const viewDashboard = createModel<RootModel>()({
  name: 'viewDashboard',
  state: {
    highlightedAddresses: new Set(),

    loadingAddress: false,
    accountsList: [],
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

      highlightedAddresses.delete(payload.address);
      let addrs = [...highlightedAddresses];
      if (nextPinned) {
        addrs.unshift(payload.address);
        await store.app.wallet.updateHighlightedAddresses(addrs);
      } else {
        highlightedAddresses.delete(payload.address);
        addrs = [...highlightedAddresses];
        await store.app.wallet.updateHighlightedAddresses(addrs);
      }

      dispatch.viewDashboard.setField({
        highlightedAddresses: new Set(addrs),
      });
      dispatch.viewDashboard.getHilightedAddressesAsync();
    },

    async getAllAccountsToDisplay(_?, store?) {
      dispatch.viewDashboard.setField({ loadingAddress: true });

      const [
        displayedKeyrings,
        allAlianNames,
        allContactNames,
      ] = await Promise.all([
        await store.app.wallet.getAllVisibleAccounts(),
        await store.app.wallet.getAllAlianName(),
        await store.app.wallet.getContactsByMap(),
      ]);

      const result = await Promise.all<IDisplayedAccountWithBalance>(
        displayedKeyrings
          .map((item) => {
            return item.accounts.map((account) => {
              return {
                ...account,
                type: item.type,
                alianName:
                  allContactNames[account?.address?.toLowerCase()]?.name ||
                  allAlianNames[account?.address?.toLowerCase()],
                keyring: item.keyring,
              };
            });
          })
          .flat(1)
          .map(async (item) => {
            let balance = await store.app.wallet.getAddressCacheBalance(
              item?.address
            );
            if (!balance) {
              balance = await store.app.wallet.getAddressBalance(item?.address);
            }
            return {
              ...item,
              balance: balance?.total_usd_value || 0,
            };
          })
      );
      dispatch.viewDashboard.setField({ loadingAddress: false });

      if (result) {
        const withBalanceList = result.sort((a, b) => {
          return new BigNumber(b?.balance || 0)
            .minus(new BigNumber(a?.balance || 0))
            .toNumber();
        });
        dispatch.viewDashboard.setField({ accountsList: withBalanceList });
      }
    },
  }),
});
