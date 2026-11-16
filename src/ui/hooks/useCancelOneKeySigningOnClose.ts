import { useCallback, useEffect, useRef } from 'react';
import { KEYRING_CLASS } from '@/constant';
import { useWallet } from '@/ui/utils';

export function useCancelOneKeySigningOnClose({
  accountType,
  address,
  active,
}: {
  accountType?: string;
  address?: string;
  active: boolean;
}) {
  const wallet = useWallet();
  const activeAddressRef = useRef<string | null>(null);
  activeAddressRef.current =
    accountType === KEYRING_CLASS.HARDWARE.ONEKEY && active && address
      ? address
      : null;

  const cancelIfActive = useCallback(() => {
    const signingAddress = activeAddressRef.current;
    if (!signingAddress) {
      return;
    }
    activeAddressRef.current = null;
    void wallet.cancelOneKeySigning(signingAddress).catch(console.error);
  }, [wallet]);

  useEffect(() => {
    window.addEventListener('beforeunload', cancelIfActive);
    return () => {
      window.removeEventListener('beforeunload', cancelIfActive);
      cancelIfActive();
    };
  }, [cancelIfActive]);

  return cancelIfActive;
}
