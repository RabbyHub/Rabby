import { useRabbySelector } from '@/ui/store';
import { computeLivePortfolioValue } from '../utils/accountPricing';

/**
 * Live Portfolio Value from the WS-subscribed store, on the official site's
 * Total Equity basis:
 *
 * - unified / portfolio margin: USD value of all spot assets (the perps-side
 *   accountValue mirrors money the spot total already counts);
 * - manual: spot value + aggregated perps equity;
 * - every mode: plus staking-account HYPE at the spot mark.
 *
 * Returns null until the relevant slices are ready — callers fall back to the
 * portfolio API's last point, which already counts staking.
 *
 * The whole computation runs inside ONE selector on purpose: it returns a
 * rounded number, so the store's Object.is check suppresses re-renders on
 * every tick of the unthrottled market-wide price feed. Subscribing to
 * spotAssetCtxs directly would re-render the host component on each frame no
 * matter how the result is memoised.
 */
export const usePerpsPortfolioLiveValue = (enabled = true): number | null =>
  useRabbySelector((s) => (enabled ? computeLivePortfolioValue(s.perps) : null));
