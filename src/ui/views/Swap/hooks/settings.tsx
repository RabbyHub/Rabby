import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { useMemo } from 'react';

export const useSwapSettings = () => {
  const swapViewList = useRabbySelector((s) => s.swap.viewList);
  const swapTradeList = useRabbySelector((s) => s.swap.tradeList);
  const prevChain = useRabbySelector((s) => s.swap.selectedChain);
  const dispatch = useRabbyDispatch();

  const methods = useMemo(() => {
    const { setSelectedChain, setSwapTrade, setSwapView } = dispatch.swap;
    return { setSelectedChain, setSwapTrade, setSwapView };
  }, [dispatch]);

  return {
    swapViewList,
    swapTradeList,
    prevChain,
    ...methods,
  };
};
