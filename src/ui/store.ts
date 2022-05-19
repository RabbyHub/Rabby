import { init } from '@rematch/core';
import type { RematchDispatch, RematchRootState } from '@rematch/core';
import { models, RootModel } from './models';
import {
  connect,
  useDispatch,
  useSelector,
  EqualityFn,
  useStore,
  TypedUseSelectorHook,
} from 'react-redux';
import selectPlugin from '@rematch/select';

const store = init<RootModel>({ models, plugins: [selectPlugin()] });

export type RabbyStore = typeof store;
export type RabbyDispatch = RematchDispatch<RootModel>;
export type RabbyRootState = RematchRootState<RootModel>;

export { connect as connectStore };

export function useRabbyStore() {
  const dispatch = useDispatch<RabbyDispatch>();

  return {
    dispatch,
    useSelector: <Selected = unknown>(
      selector: (state: RabbyRootState) => Selected,
      equalityFn?: EqualityFn<Selected> | undefined
    ) => useSelector(selector, equalityFn),
  };
}

export function useGetter<Selected = unknown>(
  selector: (
    select: RabbyStore['select']
  ) => (state: RabbyRootState) => Selected
) {
  // const store = useStore() as RabbyStore;
  return useSelector(selector(store.select));
}
export default store;
