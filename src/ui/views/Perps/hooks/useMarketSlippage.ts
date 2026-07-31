import { useEffect, useMemo, useState } from 'react';
import { getPerpsSDK } from '../sdkManager';
import {
  BookLevel,
  computeMarketSlippage,
  MarketSlippageResult,
  PERPS_SLIPPAGE_DISPLAY_MIN,
} from '../slippageUtils';

interface Book {
  bids: BookLevel[];
  asks: BookLevel[];
}

export interface UseMarketSlippageParams {
  coin: string;
  /** true eats asks (buy), false eats bids (sell). */
  isBuy: boolean;
  /** Order size in coin units. */
  size: number;
  markPrice: number;
  enabled?: boolean;
}

export interface UseMarketSlippageResult extends MarketSlippageResult {
  isReady: boolean;
  /** Sticky: true once slippage exceeded the display threshold; stays true until re-enabled (popup reopen etc.). */
  shouldShow: boolean;
}

/** Subscribes to the L2 book for `coin` and estimates market fill slippage for a `size`-unit order. */
export const useMarketSlippage = ({
  coin,
  isBuy,
  size,
  markPrice,
  enabled = true,
}: UseMarketSlippageParams): UseMarketSlippageResult => {
  const [book, setBook] = useState<Book | null>(null);
  const [everShown, setEverShown] = useState(false);

  useEffect(() => {
    setBook(null);
    setEverShown(false);
    if (!enabled || !coin) return;

    const sdk = getPerpsSDK();
    // Omit nSigFigs -> SDK sends null -> full-precision book.
    const { unsubscribe } = sdk.ws.subscribeToL2Book({ coin }, (data) => {
      if (!data?.levels) return;
      setBook({
        bids: data.levels[0] || [],
        asks: data.levels[1] || [],
      });
    });

    return () => unsubscribe();
  }, [coin, enabled]);

  const result = useMemo(() => {
    if (!book) {
      return {
        avgPx: 0,
        slippage: 0,
        depthInsufficient: false,
        isReady: false,
      };
    }
    const levels = isBuy ? book.asks : book.bids;
    return {
      ...computeMarketSlippage(levels, size, markPrice),
      isReady: true,
    };
  }, [book, isBuy, size, markPrice]);

  const overMin =
    result.isReady && result.slippage > PERPS_SLIPPAGE_DISPLAY_MIN;

  useEffect(() => {
    if (overMin && !everShown) setEverShown(true);
  }, [overMin, everShown]);

  return { ...result, shouldShow: everShown || overMin };
};
