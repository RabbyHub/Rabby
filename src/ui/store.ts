import type { AccountActions, AccountState } from './state/account';
import { accountActions, useAccountStore } from './state/account';
import type {
  AccountToDisplayActions,
  AccountToDisplayState,
} from './state/accountToDisplay';
import {
  accountToDisplayActions,
  useAccountToDisplayStore,
} from './state/accountToDisplay';
import type {
  AddressManagementActions,
  AddressManagementState,
} from './state/addressManagement';
import {
  addressManagementActions,
  useAddressManagementStore,
} from './state/addressManagement';
import type { BridgeActions, BridgeState } from './state/bridge';
import { bridgeActions, useBridgeStore } from './state/bridge';
import type { ChainsActions, ChainsState } from './state/chains';
import { chainsActions, useChainsStore } from './state/chains';
import { createSelectorStore } from './state/createStore/createSelectorStore';
import type { GiftActions, GiftState } from './state/gift';
import { giftActions, useGiftStore } from './state/gift';
import type { GasAccountActions, GasAccountState } from './state/gasAccount';
import { gasAccountActions, useGasAccountStore } from './state/gasAccount';
import { initializeUIStore } from './state/initializeUIStore';
import type { PerpsActions, PerpsState } from './state/perps';
import { perpsActions, usePerpsStore } from './state/perps';
import type { PreferenceActions, PreferenceState } from './state/preference';
import { preferenceActions, usePreferenceStore } from './state/preference';

export type RabbyDispatch = {
  account: AccountActions;
  accountToDisplay: AccountToDisplayActions;
  addressManagement: AddressManagementActions;
  bridge: BridgeActions;
  chains: ChainsActions;
  gift: GiftActions;
  gasAccount: GasAccountActions;
  perps: PerpsActions;
  preference: PreferenceActions;
};

export type RabbyRootState = {
  account: AccountState;
  accountToDisplay: AccountToDisplayState;
  addressManagement: AddressManagementState;
  bridge: BridgeState;
  chains: ChainsState;
  gift: GiftState;
  gasAccount: GasAccountState;
  perps: PerpsState;
  preference: PreferenceState;
};

const rabbyDispatch: RabbyDispatch = {
  account: accountActions,
  accountToDisplay: accountToDisplayActions,
  addressManagement: addressManagementActions,
  bridge: bridgeActions,
  chains: chainsActions,
  gift: giftActions,
  gasAccount: gasAccountActions,
  perps: perpsActions,
  preference: preferenceActions,
};

initializeUIStore();

const useCombinedStore = createSelectorStore<RabbyRootState>()(() => ({
  account: useAccountStore.getState(),
  accountToDisplay: useAccountToDisplayStore.getState(),
  addressManagement: useAddressManagementStore.getState(),
  bridge: useBridgeStore.getState(),
  chains: useChainsStore.getState(),
  gift: useGiftStore.getState(),
  gasAccount: useGasAccountStore.getState(),
  perps: usePerpsStore.getState(),
  preference: usePreferenceStore.getState(),
}));

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
usePerpsStore.subscribe((perps) => {
  useCombinedStore.setState({ perps });
});
usePreferenceStore.subscribe((preference) => {
  useCombinedStore.setState({ preference });
});

/**
 * Compatibility helper for legacy call sites. The old `connect()` calls did
 * not select Redux state or consume an injected dispatch prop, so returning
 * the component directly preserves their behavior without a Redux Provider.
 */
export const connectStore = () => <Component>(component: Component) =>
  component;

export const useRabbyDispatch = () => rabbyDispatch;

export const useRabbySelector = <Selected>(
  selector: (state: RabbyRootState) => Selected
) => useCombinedStore(selector);
