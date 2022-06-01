import selectPlugin from '@rematch/select';
import { init, RematchDispatch, RematchRootState } from '@rematch/core';
// import type { RematchDispatch, RematchRootState } from '@rematch/core';
import { models, RootModel } from './models';
import {
  connect,
  useDispatch,
  useSelector,
  TypedUseSelectorHook,
} from 'react-redux';

const store = init<RootModel>({ models, plugins: [selectPlugin()] });

export type RabbyStore = typeof store;
export type RabbyDispatch = RematchDispatch<RootModel>;
export type RabbyRootState = RematchRootState<RootModel>;
type RootState = RabbyRootState;

export { connect as connectStore };

export const useRabbyDispatch = () => useDispatch<RabbyDispatch>();
export const useRabbySelector: TypedUseSelectorHook<RootState> = useSelector;

export function useRabbyGetter<Selected = unknown>(
  selector: (select: RabbyStore['select']) => (state: RootState) => Selected
) {
  return useSelector(selector(store.select));
}

export default store;
