import { useSwapStore } from '@/ui/stores/swap';
import { useCallback, useEffect, useMemo, useState } from 'react';

const useSlippageStore = () => {
  const autoSlippage = useSwapStore((store) => !!store.autoSlippage);
  const isCustomSlippage = useSwapStore((store) => !!store.isCustomSlippage);
  const setAutoSlippageOnStore = useSwapStore((s) => s.setAutoSlippage);
  const setIsCustomSlippageOnStore = useSwapStore((s) => s.setIsCustomSlippage);

  const setAutoSlippage = useCallback(
    (bool: boolean) => {
      setAutoSlippageOnStore(bool);
    },
    [setAutoSlippageOnStore]
  );

  const setIsCustomSlippage = useCallback(
    (bool: boolean) => {
      setIsCustomSlippageOnStore(bool);
    },
    [setIsCustomSlippageOnStore]
  );

  return {
    autoSlippage,
    isCustomSlippage,
    setAutoSlippage,
    setIsCustomSlippage,
  };
};

export const useSwapSlippage = () => {
  const previousSlippage = useSwapStore((s) => s.slippage || '');
  const [slippageState, setSlippageState] = useState(previousSlippage || '0.1');

  const setSlippageOnStore = useSwapStore((s) => s.setSlippage);

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

export const getSwapAutoSlippageValue = (isStableCoin: boolean) => {
  return isStableCoin ? '0.1' : '1';
};
