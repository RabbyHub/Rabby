import { useMemo } from 'react';
import { useRemovedTokensStore } from '@/ui/state/removedTokens';
import { getRemovedTokenKey } from '@/utils/removedTokens';

export { useRemovedTokensStore as useRemovedTokens } from '@/ui/state/removedTokens';
export type { RemovedTokensState } from '@/ui/state/removedTokens';
export type { RemovedToken } from '@/background/service/removedTokens';

/** Filters portfolio browsing only; search keeps removed tokens visible. */
export const usePortfolioDisplayTokens = <
  T extends { id: string; chain: string; _tokenId?: string }
>(
  tokens: T[],
  isSearch = false
) => {
  const removedTokens = useRemovedTokensStore((state) => state.removedTokens);

  return useMemo(() => {
    if (isSearch || !removedTokens.length) return tokens;
    const removedKeys = new Set(removedTokens.map(getRemovedTokenKey));
    return tokens.filter(
      (token) =>
        !removedKeys.has(
          getRemovedTokenKey({
            tokenId: token._tokenId ?? token.id,
            chain: token.chain,
          })
        )
    );
  }, [tokens, removedTokens, isSearch]);
};
