/**
 * @author richardo2016x
 * @email richardo2016x@gmail.com
 * @create date 2022-05-27 17:01:24
 * @modify date 2022-05-27 17:01:24
 *
 * @desc biz hooks based on store (see ./store.ts),
 *
 * @warning all hooks ONLY valid if the component connected
 * to the store by `connectStore` API in ./store.ts
 */

import { useRabbyDispatch, useRabbySelector } from './store';

export function useAccount() {
  const account = useRabbySelector((state) => state.account.currentAccount);
  const dispatch = useRabbyDispatch();
  const setAccount = dispatch.account.setCurrentAccount;
  return [account, setAccount] as const;
}
