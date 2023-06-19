import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { useMemo } from 'react';
import { useSetRefreshId } from './context';
import { useDebounce } from 'react-use';

export const useSwapSettings = () => {
  const swapViewList = useRabbySelector((s) => s.swap.viewList);
  const swapTradeList = useRabbySelector((s) => s.swap.tradeList);
  const prevChain = useRabbySelector((s) => s.swap.selectedChain);

  const dispatch = useRabbyDispatch();

  const methods = useMemo(() => {
    const { setSelectedChain, setSwapTrade, setSwapView } = dispatch.swap;
    return { setSelectedChain, setSwapTrade, setSwapView };
  }, [dispatch]);

  const setRefreshId = useSetRefreshId();

  useDebounce(
    () => {
      setRefreshId((e) => e + 1);
    },
    300,
    [swapViewList, swapTradeList]
  );

  return {
    swapViewList,
    swapTradeList,
    prevChain,
    ...methods,
  };
};
