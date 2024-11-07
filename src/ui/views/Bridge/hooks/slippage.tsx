import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { useCallback, useMemo, useState } from 'react';

export const useBridgeSlippage = () => {
  const previousSlippage = useRabbySelector((s) => s.bridge.slippage || '1');
  const [slippageState, setSlippageState] = useState(previousSlippage);

  const setSlippageOnStore = useRabbyDispatch().bridge.setSlippage;

  const slippage = useMemo(() => slippageState || '0.03', [slippageState]);
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
      slippageState?.trim() !== '' && Number(slippageState || 0) < 0.2,
      slippageState?.trim() !== '' && Number(slippageState || 0) > 3,
    ];
  }, [slippageState]);

  return {
    slippageChanged,
    setSlippageChanged,
    slippageState,
    isSlippageLow,
    isSlippageHigh,
    slippage,
    setSlippage,
  };
};

export const useBridgeSlippageStore = () => {
  const { autoSlippage, isCustomSlippage } = useRabbySelector((store) => ({
    autoSlippage: store.bridge.autoSlippage,
    isCustomSlippage: !!store.bridge.isCustomSlippage,
  }));

  const dispatch = useRabbyDispatch();

  const setAutoSlippage = useCallback(
    (bool: boolean) => {
      dispatch.bridge.setAutoSlippage(bool);
    },
    [dispatch]
  );

  const setIsCustomSlippage = useCallback(
    (bool: boolean) => {
      dispatch.bridge.setIsCustomSlippage(bool);
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
