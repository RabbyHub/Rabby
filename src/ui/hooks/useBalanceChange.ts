import { useMemo } from 'react';

import { ExplainTxResponse } from '@/background/service/openapi';

function getDefaultValues() {
  return {
    hasNFTChange: false,
    hasTokenChange: false,
    noAnyChange: true,
    belowBlockIsEmpty: false,
    renderBlocks: ['token-bc', 'nft-bc'] as const,
  };
}

export default function useBalanceChange({
  balance_change,
}: {
  balance_change?: ExplainTxResponse['balance_change'] | null;
}) {
  if (!balance_change) return getDefaultValues();

  return useMemo(() => {
    const hasNFTChange =
      balance_change.receive_nft_list.length > 0 ||
      balance_change.send_nft_list.length > 0;
    const hasTokenChange =
      balance_change.receive_token_list.length > 0 ||
      balance_change.send_token_list.length > 0;
    const noAnyChange = !hasNFTChange && !hasTokenChange;

    const renderBlocks = hasTokenChange
      ? (['token-bc', 'nft-bc'] as const)
      : (['nft-bc', 'token-bc'] as const);

    const belowBlockIsEmpty = !hasTokenChange || !hasNFTChange;

    return {
      hasNFTChange,
      hasTokenChange,
      noAnyChange,
      belowBlockIsEmpty,
      renderBlocks,
    };
  }, [balance_change]);
}
