import BigNumber from 'bignumber.js';
import { MarketData, MarketDataMap } from '@/ui/models/perps';
import { getSpotBalanceKey, PerpsQuoteAsset } from '@/ui/views/Perps/constants';
import { AggregatedClearinghouseState } from '../../utils';

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
  return maxRatio.toNumber();
};

/**
 * Non-unified cross margin ratio:
 *   crossMaintenanceMarginUsed / crossMarginSummary.accountValue
 * (Spot doesn't back perp collateral when not unified.)
 */
export const computeCrossMarginRatio = (
  clearinghouseState: AggregatedClearinghouseState | null
): number => {
  const denom = new BigNumber(
    clearinghouseState?.crossMarginSummary?.accountValue || 0
  );
  if (!denom.gt(0)) return 0;
  return new BigNumber(clearinghouseState?.crossMaintenanceMarginUsed || 0)
    .dividedBy(denom)
    .toNumber();
};
