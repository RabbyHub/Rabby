import { init } from '@rematch/core';
import { models, RootModel, RabbyDispatch, RabbyRootState } from './models';
import { connect, useDispatch } from 'react-redux';

import onStoreInitialized from './models/_uistore';
import { accountActions, useAccountStore } from './state/account';
import {
  accountToDisplayActions,
  useAccountToDisplayStore,
} from './state/accountToDisplay';
import {
  addressManagementActions,
  useAddressManagementStore,
} from './state/addressManagement';
import { bridgeActions, useBridgeStore } from './state/bridge';
import { chainsActions, useChainsStore } from './state/chains';
import { giftActions, useGiftStore } from './state/gift';
import { gasAccountActions, useGasAccountStore } from './state/gasAccount';
import { preferenceActions, usePreferenceStore } from './state/preference';
import { createSelectorStore } from './state/createStore/createSelectorStore';

const store = init<RootModel>({ models });
(store.dispatch as RabbyDispatch).account = accountActions;
(store.dispatch as RabbyDispatch).accountToDisplay = accountToDisplayActions;
(store.dispatch as RabbyDispatch).addressManagement = addressManagementActions;
(store.dispatch as RabbyDispatch).bridge = bridgeActions;
(store.dispatch as RabbyDispatch).chains = chainsActions;
(store.dispatch as RabbyDispatch).gift = giftActions;
(store.dispatch as RabbyDispatch).gasAccount = gasAccountActions;
(store.dispatch as RabbyDispatch).preference = preferenceActions;

onStoreInitialized(store);

const useCombinedStore = createSelectorStore<RabbyRootState>()(() => ({
  ...store.getState(),
  account: useAccountStore.getState(),
  accountToDisplay: useAccountToDisplayStore.getState(),
  addressManagement: useAddressManagementStore.getState(),
  bridge: useBridgeStore.getState(),
  chains: useChainsStore.getState(),
  gift: useGiftStore.getState(),
  gasAccount: useGasAccountStore.getState(),
  preference: usePreferenceStore.getState(),
}));

store.subscribe(() => {
  useCombinedStore.setState(store.getState());
});
useAccountStore.subscribe((account) => {
  useCombinedStore.setState({ account });
});
useAccountToDisplayStore.subscribe((accountToDisplay) => {
  useCombinedStore.setState({ accountToDisplay });
});
useAddressManagementStore.subscribe((addressManagement) => {
  useCombinedStore.setState({ addressManagement });
});
useBridgeStore.subscribe((bridge) => {
  useCombinedStore.setState({ bridge });
});
useChainsStore.subscribe((chains) => {
  useCombinedStore.setState({ chains });
});
useGiftStore.subscribe((gift) => {
  useCombinedStore.setState({ gift });
});
useGasAccountStore.subscribe((gasAccount) => {
  useCombinedStore.setState({ gasAccount });
});
usePreferenceStore.subscribe((preference) => {
  useCombinedStore.setState({ preference });
});

export type { RabbyRootState };

export { connect as connectStore };

export const useRabbyDispatch = () => useDispatch<RabbyDispatch>();
export const useRabbySelector = <Selected>(
  selector: (state: RabbyRootState) => Selected
) => useCombinedStore(selector);

export default store;
