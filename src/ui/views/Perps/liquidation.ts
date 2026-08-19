import BigNumber from 'bignumber.js';
import type { ClearinghouseState } from '@rabby-wallet/hyperliquid-sdk';
import type { PerpsQuoteAsset } from '@/utils/perps/quoteAsset';
import { COLLATERAL_TOKEN_TO_QUOTE } from '@/utils/perps/quoteAsset';

// Free of browser globals so it stays unit-testable; `./utils` re-exports it
// all, so importers don't need to know it lives here.

export const getCollateralTokenId = (
  quoteAsset?: PerpsQuoteAsset | null
): number | null => {
  if (!quoteAsset) return null;
  const match = Object.entries(COLLATERAL_TOKEN_TO_QUOTE).find(
    ([, quote]) => quote === quoteAsset
  );
  return match ? Number(match[0]) : null;
};

/**
 * Cross balance backing a liquidation estimate: what the account has left over
 * after the maintenance margin it ALREADY owes. The projected order's own
 * maintenance margin is deliberately not taken off here — `calLiquidationPrice`
 * charges that itself, off the notional it is handed.
 *
 * - Unified account: a perp DEX's `accountValue` excludes the spot collateral
 *   actually backing it, so only the server's per-token balance is usable.
 * - Standard account: cross collateral is shared just inside one DEX.
 * - Portfolio margin: a different liquidation model — fail closed.
 *
 * null means callers should hide the estimate rather than show a guess.
 */
export const resolveCrossMarginAvailableAfterMaintenance = ({
  dexState,
  quoteAsset,
  tokenToAvailableAfterMaintenance,
  userAbstraction,
}: {
  dexState?: ClearinghouseState | null;
  quoteAsset?: PerpsQuoteAsset | null;
  tokenToAvailableAfterMaintenance?: [number, string][] | null;
  /** Compared as a string so this module needs no SDK enum at runtime. */
  userAbstraction?: string | null;
}): number | null => {
  const normalize = (value: number) =>
    Number.isFinite(value) && value >= 0 ? value : null;

  if (userAbstraction === 'portfolioMargin') {
    return null;
  }

  if (userAbstraction === 'unifiedAccount') {
    const collateralToken = getCollateralTokenId(quoteAsset);
    if (collateralToken == null) return null;
    const entry = tokenToAvailableAfterMaintenance?.find(
      ([token]) => token === collateralToken
    );
    return normalize(Number(entry?.[1] ?? Number.NaN));
  }

  const accountValue = Number(
    dexState?.crossMarginSummary?.accountValue ?? Number.NaN
  );
  const maintenance = Number(
    dexState?.crossMaintenanceMarginUsed ?? Number.NaN
  );
  if (
    !Number.isFinite(accountValue) ||
    !Number.isFinite(maintenance) ||
    maintenance < 0
  ) {
    return null;
  }
  return normalize(accountValue - maintenance);
};

export const calLiquidationPrice = (
  markPrice: number,
  margin: number,
  direction: 'Long' | 'Short',
  positionSize: number,
  nationalValue: number,
  maxLeverage: number
) => {
  const MMR = 1 / maxLeverage / 2;
  const side = direction === 'Long' ? 1 : -1;
  // const nationalValue = margin * leverage;
  const maintenance_margin_required = nationalValue * MMR;
  const margin_available = margin - maintenance_margin_required;
  // When margin_available <= 0 (account hasn't loaded, or an abstraction mode
  // we haven't mapped surfaces 0 collateral) the formula below produces a
  // sign-inverted price — short below entry, long above. Bail out so callers
  // hide the value rather than show a misleading number.
  if (!Number.isFinite(margin_available) || margin_available <= 0) {
    return 0;
  }
  const liq_price =
    markPrice - (side * margin_available) / positionSize / (1 - MMR * side);
  // liq_price = price - side * margin_available / position_size / (1 - l * side)
  return Math.max(liq_price, 0);
};

export type PerpsProjectedPosition = {
  entryPx?: string;
  marginUsed?: string;
  /** Signed: positive = long, negative = short. */
  szi?: string;
};

const positiveBn = (value: unknown) => {
  const result = new BigNumber(
    (value as string | number | null | undefined) ?? Number.NaN
  );
  return result.isFinite() && result.gt(0) ? result : null;
};

/**
 * Liquidation price of the position an order would LEAVE BEHIND, not of the
 * order on its own: adding to a position prices the merged one — hence the
 * weighted-average entry rather than this order's price — reducing or closing
 * gets no estimate, and flipping keeps only the remainder past the old size.
 *
 * Portfolio-margin accounts never get here: their cross balance resolves to
 * null upstream.
 */
export const resolveProjectedLiquidationPrice = ({
  baseSize,
  crossMarginAvailableAfterMaintenance,
  currentPosition,
  entryPrice,
  leverage,
  marginMode,
  maxLeverage,
  pxDecimals,
  side,
}: {
  /** Order size in the base asset. */
  baseSize: string;
  crossMarginAvailableAfterMaintenance: number | null;
  currentPosition?: PerpsProjectedPosition | null;
  /** Price the order is expected to fill at. */
  entryPrice: string;
  leverage: number;
  marginMode: 'cross' | 'isolated';
  maxLeverage: number;
  pxDecimals: number;
  side: 'buy' | 'sell';
}): { liquidationPrice: string; liquidationPriceNum: number } | null => {
  const entry = positiveBn(entryPrice);
  const orderSize = positiveBn(baseSize);
  const leverageValue = positiveBn(leverage);
  if (!entry || !orderSize || !leverageValue) return null;

  const positionSize = new BigNumber(currentPosition?.szi ?? 0);
  if (!positionSize.isFinite()) return null;
  const currentSize = positionSize.abs();
  const sameDirection =
    (side === 'buy' && positionSize.gt(0)) ||
    (side === 'sell' && positionSize.lt(0));
  const flipsDirection =
    currentSize.gt(0) && !sameDirection && orderSize.gt(currentSize);
  // Shrinking a position doesn't move it to a new liquidation price.
  if (currentSize.gt(0) && !sameDirection && !flipsDirection) return null;

  const currentEntry = positiveBn(currentPosition?.entryPx);
  if (sameDirection && !currentEntry) return null;

  const currentNotional =
    sameDirection && currentEntry
      ? currentSize.multipliedBy(currentEntry)
      : new BigNumber(0);
  const projectedSize = sameDirection
    ? currentSize.plus(orderSize)
    : flipsDirection
    ? orderSize.minus(currentSize)
    : orderSize;
  // Each leg valued at its own entry, the way Hyperliquid values a position.
  const notional = sameDirection
    ? currentNotional.plus(orderSize.multipliedBy(entry))
    : projectedSize.multipliedBy(entry);
  const projectedEntry = notional.dividedBy(projectedSize);

  const margin =
    marginMode === 'cross'
      ? new BigNumber(crossMarginAvailableAfterMaintenance ?? Number.NaN)
      : sameDirection
      ? new BigNumber(currentPosition?.marginUsed ?? 0).plus(
          orderSize.multipliedBy(entry).dividedBy(leverageValue)
        )
      : notional.dividedBy(leverageValue);
  if (!margin.isFinite() || margin.lte(0)) return null;

  const liquidation = calLiquidationPrice(
    projectedEntry.toNumber(),
    margin.toNumber(),
    side === 'buy' ? 'Long' : 'Short',
    projectedSize.toNumber(),
    notional.toNumber(),
    maxLeverage
  );
  if (!Number.isFinite(liquidation) || liquidation <= 0) return null;

  return {
    liquidationPrice: new BigNumber(liquidation).toFixed(pxDecimals),
    // Unrounded too, so callers doing arithmetic don't parse the display value.
    liquidationPriceNum: liquidation,
  };
};
