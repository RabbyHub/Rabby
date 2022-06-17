import { useMemo } from 'react';

import { ExplainTxResponse } from '@/background/service/openapi';

export default function useBalanceChange({
  balance_change,
}: {
  balance_change: ExplainTxResponse['balance_change'];
}) {
  return useMemo(() => {
    const hasNFTChange =
      balance_change.receive_nft_list.length > 0 ||
      balance_change.send_nft_list.length > 0;
    const hasTokenChange =
      balance_change.receive_token_list.length > 0 ||
      balance_change.send_token_list.length > 0;
    const noAnyChange = !hasNFTChange && !hasTokenChange;

    const renderBlocks = hasNFTChange
      ? (['nft-bc', 'token-bc'] as const)
      : (['token-bc', 'nft-bc'] as const);

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
