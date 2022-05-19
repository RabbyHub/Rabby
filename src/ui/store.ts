import { init } from '@rematch/core';
import type { RematchDispatch, RematchRootState } from '@rematch/core';
import { models, RootModel } from './models';
import { connect, useDispatch, useSelector, EqualityFn } from 'react-redux';

const store = init({ models });

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

export default store;
