import { useCallback, useLayoutEffect, useRef } from 'react';
import { KEYRING_CLASS } from '@/constant';
import type { Account } from '@/background/service/preference';
import { useWallet } from '@/ui/utils';

export function useCancelOneKeyOnClose(
  account: Pick<Account, 'type' | 'address'> | null | undefined,
  signing: boolean
) {
  const wallet = useWallet();
  const pending = useRef<string>();

  useLayoutEffect(() => {
    pending.current =
      signing && account?.type === KEYRING_CLASS.HARDWARE.ONEKEY
        ? account.address
        : undefined;
  }, [account?.type, account?.address, signing]);

  const cancel = useCallback(() => {
    const address = pending.current;
    if (address) {
      pending.current = undefined;
      void wallet.cancelOneKeySigning(address).catch(console.error);
    }
  }, [wallet]);

  useLayoutEffect(() => {
    window.addEventListener('beforeunload', cancel);
    return () => {
      window.removeEventListener('beforeunload', cancel);
      cancel();
    };
  }, [cancel]);

  return cancel;
}
