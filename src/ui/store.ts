import { init } from '@rematch/core';
import type { RematchDispatch, RematchRootState } from '@rematch/core';
import { models, RootModel } from './models';
import {
  connect,
  useDispatch as _useDispatch,
  useSelector as _useSelector,
  EqualityFn,
  useStore,
  TypedUseSelectorHook,
} from 'react-redux';
import selectPlugin from '@rematch/select';
import { useCallback } from 'react';

const store = init<RootModel>({ models, plugins: [selectPlugin()] });
console.log(store);

export type RabbyStore = typeof store;
export type RabbyDispatch = RematchDispatch<RootModel>;
export type RabbyRootState = RematchRootState<RootModel>;

export { connect as connectStore };

export function useRabbyStore() {
  const dispatch = _useDispatch<RabbyDispatch>();

  return {
    dispatch,
    useSelector: <Selected = unknown>(
      selector: (state: RabbyRootState) => Selected,
      equalityFn?: EqualityFn<Selected> | undefined
    ) => _useSelector(selector, equalityFn),
  };
}

export const useSelector: TypedUseSelectorHook<RabbyRootState> = _useSelector;
export const useDispatch = () => _useDispatch<RabbyDispatch>();

export function useGetter<Selected = unknown>(
  selector: (
    select: RabbyStore['select']
  ) => (state: RabbyRootState) => Selected
) {
  // const store = useStore() as RabbyStore;
  return useSelector(selector(store.select));
}

export function useAccount() {
  const account = useSelector((state) => state.account.currentAccount);
  const dispatch = useDispatch();
  const setAccount = dispatch.account.setCurrentAccount;
  return [account, setAccount] as const;
}
export default store;
