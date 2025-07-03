import { useMemo } from 'react';
import { useRabbySelector } from '@/ui/store';
import useSortToken from '@/ui/hooks/useSortTokens';

export const useFilteredTokens = (
  selectChainId: string | null,
  isTestnet: boolean = false
) => {
  const { customize, blocked } = useRabbySelector((store) =>
    isTestnet ? store.account.testnetTokens : store.account.tokens
  );

  const filteredCustomize = useMemo(() => {
    if (selectChainId) {
      return customize.filter((token) => token.chain === selectChainId);
    }
    return customize;
  }, [customize, selectChainId]);

  const filteredBlocked = useMemo(() => {
    if (selectChainId) {
      return blocked.filter((token) => token.chain === selectChainId);
    }
    return blocked;
  }, [blocked, selectChainId]);

  const sortedCustomize = useSortToken(filteredCustomize);
  const sortedBlocked = useSortToken(filteredBlocked);

  return {
    filteredCustomize,
    filteredBlocked,
    sortedCustomize,
    sortedBlocked,
    customizeCount: filteredCustomize.length,
    blockedCount: filteredBlocked.length,
  };
};
