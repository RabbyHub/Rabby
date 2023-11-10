import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { useMemo } from 'react';

export const useSwapSettings = () => {
  const swapViewList = useRabbySelector((s) => s.swap.viewList);
  const swapTradeList = useRabbySelector((s) => s.swap.tradeList);
  const prevChain = useRabbySelector((s) => s.swap.selectedChain);
  const sortIncludeGasFee = useRabbySelector((s) => s.swap.sortIncludeGasFee);
  const dispatch = useRabbyDispatch();

  const methods = useMemo(() => {
    const {
      setSelectedChain,
      setSwapTrade,
      setSwapView,
      setSwapSortIncludeGasFee,
    } = dispatch.swap;
    return {
      setSelectedChain,
      setSwapTrade,
      setSwapView,
      setSwapSortIncludeGasFee,
    };
  }, [dispatch]);

  return {
    swapViewList,
    swapTradeList,
    prevChain,
    sortIncludeGasFee,
    dispatch,
    ...methods,
  };
};
