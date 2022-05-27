import { init } from '@rematch/core';
import type { RematchDispatch, RematchRootState } from '@rematch/core';
import { models, RootModel } from './models';
import {
  connect,
  useDispatch,
  useSelector,
  TypedUseSelectorHook,
} from 'react-redux';
import selectPlugin from '@rematch/select';

const store = init<RootModel>({ models, plugins: [selectPlugin()] });

export type RabbyStore = typeof store;
export type RabbyDispatch = RematchDispatch<RootModel>;
export type RabbyRootState = RematchRootState<RootModel>;

export { connect as connectStore };

export const useRabbyDispatch = () => useDispatch<RabbyDispatch>();
export const useRabbySelector: TypedUseSelectorHook<RabbyRootState> = useSelector;

export function useRabbyGetter<Selected = unknown>(
  selector: (
    select: RabbyStore['select']
  ) => (state: RabbyRootState) => Selected
) {
  return useSelector(selector(store.select));
}

export default store;
