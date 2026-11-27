/**
 * @author richardo2016x
 * @email richardo2016x@gmail.com
 * @create date 2022-05-27 17:01:24
 * @modify date 2022-05-27 17:01:24
 *
 * @desc biz hooks based on store (see ./store.ts),
 *
 */
import { useAccountStore } from './state/account';

export function useAccount() {
  const account = useAccountStore((state) => state.currentAccount);
  const setAccount = useAccountStore((state) => state.setCurrentAccount);
  return [account, setAccount] as const;
}
