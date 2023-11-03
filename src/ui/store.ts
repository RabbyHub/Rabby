import { init } from '@rematch/core';
import { models, RootModel, RabbyDispatch, RabbyRootState } from './models';
import {
  connect,
  useDispatch,
  useSelector,
  TypedUseSelectorHook,
} from 'react-redux';
import selectPlugin from '@rematch/select';

import onStoreInitialized from './models/_uistore';

const store = init<RootModel>({ models, plugins: [selectPlugin()] });

onStoreInitialized(store);

export type { RabbyRootState };

export { connect as connectStore };

export const useRabbyDispatch = () => useDispatch<RabbyDispatch>();
export const useRabbySelector: TypedUseSelectorHook<RabbyRootState> = useSelector;

export function useRabbyGetter<Selected = unknown>(
  selector: (
    select: typeof store['select']
  ) => (state: RabbyRootState) => Selected
) {
  return useSelector(selector(store.select));
}

export default store;
