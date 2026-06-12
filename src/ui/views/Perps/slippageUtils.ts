import BigNumber from 'bignumber.js';

/** Threshold above which a market order is flagged as low-liquidity. */
export const PERPS_SLIPPAGE_THRESHOLD = 0.0005;
/** Threshold above which the slippage value is highlighted (warning). */
export const PERPS_SLIPPAGE_WARNING = 0.0001;

export interface BookLevel {
  px: string;
  sz: string;
}

export interface MarketSlippageResult {
  avgPx: number;
  slippage: number;
  /** Visible book depth can't cover the full size. */
  depthInsufficient: boolean;
}

const EMPTY: MarketSlippageResult = {
  avgPx: 0,
  slippage: 0,
  depthInsufficient: false,
};

/** Walk the book (asks for buy, bids for sell) to estimate the market fill avg price and slippage vs markPx. */
export const computeMarketSlippage = (
  levels: BookLevel[] | undefined,
  size: number,
  markPx: number
): MarketSlippageResult => {
  if (!levels?.length || !size || size <= 0 || !markPx || markPx <= 0) {
    return EMPTY;
  }

  let remaining = size;
  let cost = new BigNumber(0);
  for (const lvl of levels) {
    const px = Number(lvl.px);
    const sz = Number(lvl.sz);
    if (!px || !sz || sz <= 0) continue;
    const take = Math.min(remaining, sz);
    cost = cost.plus(new BigNumber(px).times(take));
    remaining -= take;
    if (remaining <= 1e-12) {
      remaining = 0;
      break;
    }
  }

  const filled = size - remaining;
  if (filled <= 0) {
    return { avgPx: 0, slippage: 0, depthInsufficient: true };
  }

  const avgPx = cost.div(filled).toNumber();
  const slippage = Math.abs(avgPx - markPx) / markPx;
  return { avgPx, slippage, depthInsufficient: remaining > 0 };
};
