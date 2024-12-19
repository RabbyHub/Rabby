import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { useCallback, useMemo, useState } from 'react';

const useSlippageStore = () => {
  const { autoSlippage, isCustomSlippage } = useRabbySelector((store) => ({
    autoSlippage: !!store.swap.autoSlippage,
    isCustomSlippage: !!store.swap.isCustomSlippage,
  }));

  const dispatch = useRabbyDispatch();

  const setAutoSlippage = useCallback(
    (bool: boolean) => {
      dispatch.swap.setAutoSlippage(bool);
    },
    [dispatch]
  );

  const setIsCustomSlippage = useCallback(
    (bool: boolean) => {
      dispatch.swap.setIsCustomSlippage(bool);
    },
    [dispatch]
  );

  return {
    autoSlippage,
    isCustomSlippage,
    setAutoSlippage,
    setIsCustomSlippage,
  };
};

export const useSwapSlippage = () => {
  const previousSlippage = useRabbySelector((s) => s.swap.slippage || '');
  const [slippageState, setSlippageState] = useState(previousSlippage || '0.1');

  const setSlippageOnStore = useRabbyDispatch().swap.setSlippage;

  const slippage = useMemo(() => slippageState || '0.1', [slippageState]);
  const [slippageChanged, setSlippageChanged] = useState(false);

  const setSlippage = useCallback(
    (slippage: string) => {
      setSlippageOnStore(slippage);
      setSlippageState(slippage);
    },
    [setSlippageOnStore]
  );

  const [isSlippageLow, isSlippageHigh] = useMemo(() => {
    return [
      slippageState?.trim() !== '' && Number(slippageState || 0) < 0.1,
      slippageState?.trim() !== '' && Number(slippageState || 0) > 10,
    ];
  }, [slippageState]);

  const slippageStore = useSlippageStore();

  return {
    slippageChanged,
    setSlippageChanged,
    slippageState,
    isSlippageLow,
    isSlippageHigh,
    slippage,
    setSlippage,
    ...slippageStore,
  };
};
