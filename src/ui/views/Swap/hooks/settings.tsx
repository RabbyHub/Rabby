import { useSwapStore } from '@/ui/stores/swap';
import { useMemo } from 'react';

export const useSwapSettings = () => {
  const prevChain = useSwapStore((s) => s.selectedChain);
  const setSelectedChain = useSwapStore((s) => s.setSelectedChain);

  const methods = useMemo(() => {
    return {
      setSelectedChain,
    };
  }, [setSelectedChain]);

  return {
    prevChain,
    ...methods,
  };
};
