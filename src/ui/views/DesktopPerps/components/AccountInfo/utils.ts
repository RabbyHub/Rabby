import BigNumber from 'bignumber.js';
import { USDC_TOKEN_ID } from '@rabby-wallet/hyperliquid-sdk';
import type { SpotMeta, FFastAssetCtx } from '@rabby-wallet/hyperliquid-sdk';
import { getSpotBalanceKey } from '@/ui/views/Perps/constants';
import type { PerpsQuoteAsset } from '@/ui/views/Perps/constants';
import { COLLATERAL_TOKEN_TO_QUOTE } from '@/utils/perps/quoteAsset';
import type { MarketData, MarketDataMap } from '@/ui/models/perps';
import type {
  AggregatedClearinghouseState,
  SpotBalance as PmSpotBalance,
} from '../../utils';

type SpotBalance = {
  total: string;
  available: string;
};

/**
 * Hyperliquid Unified Account Ratio (per official docs):
 *
 *   for each collateral token T:
 *     crossMargin[T]    = sum across perp DEXs whose collateral is T of
 *                         that dex's `crossMaintenanceMarginUsed`
 *     isolatedMargin[T] = sum of `position.marginUsed` for isolated positions
 *                         in those DEXs
 *     available[T]      = spotTotal[T] - isolatedMargin[T]
 *     ratio[T]          = crossMargin[T] / available[T]   (skip if available <= 0)
 *
 *   maxRatio = max(ratio across tokens)
 *
 * Reference:
 *   https://hyperliquid.gitbook.io/hyperliquid-docs/trading/account-abstraction-modes
 *
 * Inputs come from the existing perps store:
 *   - `clearinghouseState.crossMaintByDex`   (added by `formatAllDexsClearinghouseState`)
 *   - `clearinghouseState.assetPositions`    (already aggregated across DEXs)
 *   - `marketDataMap`                        (dex name → quoteAsset lookup)
 *   - `spotBalancesMap`                      (raw spot balances; key handled via getSpotBalanceKey)
 */
export const computeUnifiedAccountRatio = ({
  clearinghouseState,
  marketDataMap,
  spotBalancesMap,
}: {
  clearinghouseState: AggregatedClearinghouseState | null;
  marketDataMap: MarketDataMap;
  spotBalancesMap: Record<string, SpotBalance>;
}): number => {
  if (!clearinghouseState) return 0;

  const crossByQuote: Record<string, BigNumber> = {};
  const isolatedByQuote: Record<string, BigNumber> = {};

  // Cross maintenance margin by collateral token. Each dex shares one
  // collateral token across all of its markets, so we sniff it from any
  // market with a matching dexId.
  const crossMaintByDex = clearinghouseState.crossMaintByDex || {};
  const dexQuoteCache: Record<string, PerpsQuoteAsset | undefined> = {};
  const lookupDexQuote = (dexName: string) => {
    if (dexName in dexQuoteCache) return dexQuoteCache[dexName];
    const sample = (Object.values(marketDataMap) as MarketData[]).find(
      (m) => (m.dexId || '') === (dexName || '')
    );
    dexQuoteCache[dexName] = sample?.quoteAsset;
    return dexQuoteCache[dexName];
  };

  for (const [dexName, maint] of Object.entries(crossMaintByDex)) {
    const quoteAsset = lookupDexQuote(dexName);
    if (!quoteAsset) continue;
    const prev = crossByQuote[quoteAsset] || new BigNumber(0);
    crossByQuote[quoteAsset] = prev.plus(new BigNumber(maint || 0));
  }

  for (const ap of clearinghouseState.assetPositions || []) {
    if (ap.position.leverage?.type !== 'isolated') continue;
    const quoteAsset = marketDataMap[ap.position.coin]?.quoteAsset;
    if (!quoteAsset) continue;
    const prev = isolatedByQuote[quoteAsset] || new BigNumber(0);
    isolatedByQuote[quoteAsset] = prev.plus(
      new BigNumber(ap.position.marginUsed || 0)
    );
  }

  let maxRatio = new BigNumber(0);
  for (const [quoteAsset, crossMargin] of Object.entries(crossByQuote)) {
    const spotKey = getSpotBalanceKey(quoteAsset as PerpsQuoteAsset);
    const spotTotal = new BigNumber(spotBalancesMap[spotKey]?.total || 0);
    const isolatedMargin = isolatedByQuote[quoteAsset] || new BigNumber(0);
    const available = spotTotal.minus(isolatedMargin);
    if (available.gt(0)) {
      const ratio = crossMargin.dividedBy(available);
      if (ratio.gt(maxRatio)) maxRatio = ratio;
    }
  }
  // HL clamps the unified account ratio to [0, 1].
  return BigNumber.min(maxRatio, 1).toNumber();
};

/**
 * Non-unified cross margin ratio:
 *   crossMaintenanceMarginUsed / crossMarginSummary.accountValue
 * (Spot doesn't back perp collateral when not unified.)
 */
export const computeCrossMarginRatio = (
  clearinghouseState: AggregatedClearinghouseState | null
): number => {
  // HL: crossMaintenanceMarginUsed / (crossMarginSummary.accountValue + 1e-8).
  const denom = new BigNumber(
    clearinghouseState?.crossMarginSummary?.accountValue || 0
  ).plus(1e-8);
  return new BigNumber(clearinghouseState?.crossMaintenanceMarginUsed || 0)
    .dividedBy(denom)
    .toNumber();
};

// ===== Portfolio Margin / spot-collateral pricing (1:1 with the HL frontend) =====

export type SpotAssetCtxs = Record<string, FFastAssetCtx>;

// Settlement (quote) stablecoin token ids: USDC=0, USDT=268, USDE=235, USDH=360.
const SETTLEMENT_TOKEN_IDS = new Set(
  Object.keys(COLLATERAL_TOKEN_TO_QUOTE).map(Number)
);

/**
 * USDC-quoted mark price of a spot token, mirroring the HL frontend resolver:
 * USDC -> 1; outcome ('+') tokens via the '#' price key; otherwise resolve
 * tokenName -> spot pair (@index) via spotMeta (preferring the USDC pair) and
 * read its markPx, chaining through the quote token's USDC price when the pair
 * is not USDC-quoted. Returns 0 when unresolved (matches HL).
 */
export const usdcMarkPx = (
  tokenName: string,
  spotAssetCtxs: SpotAssetCtxs,
  spotMeta: SpotMeta | null | undefined
): number => {
  if (!tokenName) return 0;
  if (tokenName === 'USDC') return 1;

  if (tokenName.startsWith('+')) {
    const px = spotAssetCtxs['#' + tokenName.slice(1)]?.markPx;
    return px ? Number(px) || 0 : 0;
  }

  if (!spotMeta) return 0;

  const tokenIndex = spotMeta.tokens.find((t) => t.name === tokenName)?.index;
  if (tokenIndex == null) return 0;
  const usdcIndex =
    spotMeta.tokens.find((t) => t.name === 'USDC')?.index ?? USDC_TOKEN_ID;

  const usdcPair = spotMeta.universe.find(
    (u) => u.tokens[0] === tokenIndex && u.tokens[1] === usdcIndex
  );
  if (usdcPair) {
    const px = spotAssetCtxs[usdcPair.name]?.markPx;
    return px ? Number(px) || 0 : 0;
  }

  // Non-USDC-quoted pair: chain through the quote token's USDC price.
  const anyPair = spotMeta.universe.find((u) => u.tokens[0] === tokenIndex);
  if (!anyPair) return 0;
  const pairPx = spotAssetCtxs[anyPair.name]?.markPx;
  if (!pairPx) return 0;
  const quoteName = spotMeta.tokens.find(
    (t) => t.index === anyPair.tokens[1]
  )?.name;
  if (!quoteName || quoteName === tokenName) return 0;
  return (Number(pairPx) || 0) * usdcMarkPx(quoteName, spotAssetCtxs, spotMeta);
};

/** Z3: total spot portfolio USD value = sum(balance.total * usdcMarkPx). */
export const computeSpotPortfolioValue = (
  balances: PmSpotBalance[],
  spotAssetCtxs: SpotAssetCtxs,
  spotMeta: SpotMeta | null | undefined
): number => {
  let total = new BigNumber(0);
  for (const b of balances || []) {
    const px = usdcMarkPx(b.coin, spotAssetCtxs, spotMeta);
    total = total.plus(new BigNumber(b.total || 0).times(px));
  }
  return total.toNumber();
};

/** Unified Total Collateral Balance = sum(settlement-token balance.total * price). */
export const computeTotalCollateralBalance = (
  balances: PmSpotBalance[],
  spotAssetCtxs: SpotAssetCtxs,
  spotMeta: SpotMeta | null | undefined
): number => {
  let total = new BigNumber(0);
  for (const b of balances || []) {
    if (!SETTLEMENT_TOKEN_IDS.has(b.token)) continue;
    const px = usdcMarkPx(b.coin, spotAssetCtxs, spotMeta);
    total = total.plus(new BigNumber(b.total || 0).times(px));
  }
  return total.toNumber();
};

/**
 * PM LTV-adjusted Portfolio Value (HL's leverage denominator):
 * sum(balance.total * price * weight); weight = 1 for settlement assets, else
 * the token's ltv (e.g. 0.5 for HYPE/UBTC) when ltv>0, else 0.
 */
export const computeLtvAdjustedPortfolioValue = (
  balances: PmSpotBalance[],
  spotAssetCtxs: SpotAssetCtxs,
  spotMeta: SpotMeta | null | undefined
): number => {
  let total = new BigNumber(0);
  for (const b of balances || []) {
    let weight = 0;
    if (SETTLEMENT_TOKEN_IDS.has(b.token)) {
      weight = 1;
    } else {
      const ltv = Number(b.ltv || 0);
      weight = ltv > 0 ? ltv : 0;
    }
    if (weight === 0) continue;
    const px = usdcMarkPx(b.coin, spotAssetCtxs, spotMeta);
    total = total.plus(new BigNumber(b.total || 0).times(px).times(weight));
  }
  return total.toNumber();
};

/** Portfolio Margin Ratio: read verbatim from the server (already a 0..1 fraction). */
export const computePortfolioMarginRatio = (
  spotState: { portfolioMarginRatio?: string } | null | undefined
): number => {
  return Number(spotState?.portfolioMarginRatio || 0);
};

/**
 * Borrow Cap Used: the USDC (settlement, token id 0) entry of
 * tokenToPortfolioBorrowRatio, clamped to [0, 1]. HL reads ONLY the USDC entry,
 * not a max over tokens.
 */
export const computeBorrowCapUsed = (
  spotState:
    | { tokenToPortfolioBorrowRatio?: [number, string][] }
    | null
    | undefined
): number => {
  const entry = (spotState?.tokenToPortfolioBorrowRatio || []).find(
    ([tokenId]) => tokenId === USDC_TOKEN_ID
  );
  const ratio = entry ? Number(entry[1]) || 0 : 0;
  return Math.min(1, ratio);
};
