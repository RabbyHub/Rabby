import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { useMemo } from 'react';

export const useSwapSettings = () => {
  const prevChain = useRabbySelector((s) => s.swap.selectedChain);
  const dispatch = useRabbyDispatch();

  const methods = useMemo(() => {
    const { setSelectedChain } = dispatch.swap;
    return {
      setSelectedChain,
    };
  }, [dispatch]);

  return {
    prevChain,
    dispatch,
    ...methods,
  };
};
