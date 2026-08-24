import { init } from '@rematch/core';
import { models, RootModel, RabbyDispatch, RabbyRootState } from './models';
import { connect, useDispatch, useSelector } from 'react-redux';
import selectPlugin from '@rematch/select';

import onStoreInitialized from './models/_uistore';
import { accountActions, useAccountStore } from './state/account';
import {
  accountToDisplayActions,
  useAccountToDisplayStore,
} from './state/accountToDisplay';
import { createSelectorStore } from './state/createStore/createSelectorStore';

const store = init<RootModel>({ models, plugins: [selectPlugin()] });
(store.dispatch as RabbyDispatch).account = accountActions;
(store.dispatch as RabbyDispatch).accountToDisplay = accountToDisplayActions;

onStoreInitialized(store);

const useCombinedStore = createSelectorStore<RabbyRootState>()(() => ({
  ...store.getState(),
  account: useAccountStore.getState(),
  accountToDisplay: useAccountToDisplayStore.getState(),
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

export type { RabbyRootState };

export { connect as connectStore };

export const useRabbyDispatch = () => useDispatch<RabbyDispatch>();
export const useRabbySelector = <Selected>(
  selector: (state: RabbyRootState) => Selected
) => useCombinedStore(selector);

export function useRabbyGetter<Selected = unknown>(
  selector: (
    select: typeof store['select']
  ) => (state: ReturnType<typeof store.getState>) => Selected
) {
  return useSelector(selector(store.select));
}

export default store;
