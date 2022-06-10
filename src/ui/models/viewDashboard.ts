import { createModel } from '@rematch/core';

import { RootModel } from '.';
import { DisplayedKeryring } from '@/background/service/keyring';
import { sortAccountsByBalance } from '../utils/account';
import { Account, IHighlightedAddress } from '@/background/service/preference';

type IDisplayedAccount = Required<DisplayedKeryring['accounts'][number]>;
type IDisplayedAccountWithBalance = IDisplayedAccount & {
  balance: number;
  byImport?: boolean;
};

type IState = {
  highlightedAddresses: IHighlightedAddress[];

  loadingAddress: boolean;
  accountsList: IDisplayedAccountWithBalance[];
};

export const viewDashboard = createModel<RootModel>()({
  name: 'viewDashboard',
  state: {
    highlightedAddresses: [],

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
        highlightedAddresses: addrs,
      });
    },

    async toggleHighlightedAddressAsync(
      payload: {
        brandName: Account['brandName'];
        address: Account['address'];
        nextPinned?: boolean;
      },
      store?
    ) {
      const { highlightedAddresses } = store.viewDashboard;
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

      dispatch.viewDashboard.setField({
        highlightedAddresses: addrs,
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
        store.app.wallet.getAllVisibleAccounts(),
        store.app.wallet.getAllAlianName(),
        store.app.wallet.getContactsByMap(),
      ]);

      const result = await Promise.all<IDisplayedAccountWithBalance>(
        displayedKeyrings
          .map((item) => {
            return item.accounts.map((account) => {
              return {
                ...account,
                type: item.type,
                byImport: item.byImport,
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
        const withBalanceList = sortAccountsByBalance(result);
        dispatch.viewDashboard.setField({ accountsList: withBalanceList });
      }
    },
  }),
});
