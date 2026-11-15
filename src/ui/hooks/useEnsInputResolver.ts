import { useEffect, useState } from 'react';
import { isValidAddress } from '@ethereumjs/util';
import type { WalletControllerType } from '@/ui/utils';
import { resolveEnsAddressByName } from '@/ui/utils/ens';
import { isPossibleEnsName } from '@/ui/utils/ensName';

type EnsResult = { addr: string; name: string };
type SettledLookup = {
  query: string;
  wallet: WalletControllerType;
  result: EnsResult | null;
};

/** Bind both successful and failed lookups to the input that started them. */
export function useEnsInputResolver(
  input: string,
  wallet: WalletControllerType
) {
  const [settled, setSettled] = useState<SettledLookup | null>(null);
  const isName = !!input && !isValidAddress(input);
  const canResolve = isName && isPossibleEnsName(input);

  useEffect(() => {
    setSettled(null);
    if (!canResolve) {
      return;
    }

    // Cancelling the debounce cannot stop an in-flight CCIP-Read lookup.
    // Invalidate this attempt even if the user later types the same name again.
    let cancelled = false;
    const timer = setTimeout(async () => {
      let result: EnsResult | null = null;
      try {
        const resolved = await resolveEnsAddressByName(input, wallet);
        if (resolved && isValidAddress(resolved.addr)) {
          result = resolved;
        }
      } catch {
        result = null;
      }
      if (!cancelled) {
        setSettled({ query: input, wallet, result });
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [input, wallet, canResolve]);

  // Hide the previous result during render, before effect cleanup runs.
  const current =
    canResolve && settled?.query === input && settled.wallet === wallet
      ? settled
      : null;
  return {
    ensResult: current?.result ?? null,
    isPending: canResolve && !current,
    isNameNotFound: isName && (!canResolve || (!!current && !current.result)),
  };
}
