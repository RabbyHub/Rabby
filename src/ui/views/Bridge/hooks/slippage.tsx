import { useCallback, useMemo, useState } from 'react';
import {
  BRIDGE_SLIPPAGE_PERCENT_FALLBACK,
  resolveBridgeSlippagePercent,
} from '../utils/bridgeQuote';

export const useBridgeSlippage = () => {
  const [slippageState, setSlippageState] = useState(
    BRIDGE_SLIPPAGE_PERCENT_FALLBACK
  );

  const slippage = useMemo(() => resolveBridgeSlippagePercent(slippageState), [
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
    autoSlippage,
    isCustomSlippage,
    setAutoSlippage,
    setIsCustomSlippage,
  };
};
