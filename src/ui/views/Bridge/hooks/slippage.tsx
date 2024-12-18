import { useCallback, useMemo, useState } from 'react';

type SlippageType = 'swap' | 'bridge';

const DEFAULT = {
  swap: '0.1',
  bridge: '1',
};
const SLIPPAGE_RANGE = {
  swap: [0.1, 10],
  bridge: [0.2, 3],
};

export const useSwapAndBridgeSlippage = (type: SlippageType) => {
  const [slippageState, setSlippageState] = useState(DEFAULT[type]);

  const slippage = useMemo(() => slippageState || DEFAULT[type], [
    slippageState,
  ]);
  const [slippageChanged, setSlippageChanged] = useState(false);

  const [autoSlippage, setAutoSlippage] = useState(true);
  const [isCustomSlippage, setIsCustomSlippage] = useState(false);

  const setSlippage = useCallback((slippage: string) => {
    setSlippageState(slippage);
  }, []);

  const [isSlippageLow, isSlippageHigh] = useMemo(() => {
    return [
      slippageState?.trim() !== '' &&
        Number(slippageState || 0) < SLIPPAGE_RANGE[type][0],
      slippageState?.trim() !== '' &&
        Number(slippageState || 0) > SLIPPAGE_RANGE[type][1],
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
    autoSlippage,
    isCustomSlippage,
    setAutoSlippage,
    setIsCustomSlippage,
  };
};
