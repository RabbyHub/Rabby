import { useEffect, useMemo, useState } from 'react';
import { getPerpsSDK } from '../sdkManager';
import {
  BookLevel,
  computeMarketSlippage,
  MarketSlippageResult,
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

  useEffect(() => {
    setBook(null);
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

  return useMemo(() => {
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
};
